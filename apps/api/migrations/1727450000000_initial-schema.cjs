/* eslint-disable camelcase */
/**
 * Migration 001: initial schema
 * Creates all tables with full constraints, indexes, and a partial unique index
 * on rate_versions to enforce exactly one active version.
 */
exports.up = (pgm) => {
  // Enable citext for case-insensitive email
  pgm.createExtension('citext', { ifNotExists: true });

  // users
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'citext', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    role: { type: 'text', notNull: true, default: "'user'", check: "role IN ('user','admin')" },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('users', 'email');

  // rate_versions
  pgm.createTable('rate_versions', {
    id: { type: 'serial', primaryKey: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_by: { type: 'text', notNull: true, comment: 'email or system' },
    is_active: { type: 'boolean', notNull: true, default: false },
    note: { type: 'text' },
  });
  // Partial unique index: only one row may have is_active = true
  pgm.sql(`
    CREATE UNIQUE INDEX rate_versions_one_active
    ON rate_versions (is_active)
    WHERE is_active = true;
  `);

  // rate_parameters
  pgm.createTable('rate_parameters', {
    id: { type: 'serial', primaryKey: true },
    rate_version_id: {
      type: 'integer',
      notNull: true,
      references: '"rate_versions"',
      onDelete: 'CASCADE',
    },
    key: { type: 'text', notNull: true },
    value: { type: 'numeric', notNull: true },
    unit: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true },
    source_note: { type: 'text' },
  });
  pgm.addConstraint('rate_parameters', 'rate_parameters_version_key_unique', 'UNIQUE (rate_version_id, key)');
  pgm.createIndex('rate_parameters', 'rate_version_id');
  pgm.createIndex('rate_parameters', 'key');

  // coastal_ports (configuration — not user data)
  pgm.createTable('coastal_ports', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true },
    lat: { type: 'numeric(10,6)', notNull: true },
    lng: { type: 'numeric(10,6)', notNull: true },
  });

  // geocode_cache — starts empty, filled from usage
  pgm.createTable('geocode_cache', {
    id: { type: 'serial', primaryKey: true },
    normalized_query: { type: 'text', notNull: true, unique: true },
    result: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('geocode_cache', 'normalized_query');

  // route_cache — starts empty, filled from usage
  pgm.createTable('route_cache', {
    id: { type: 'serial', primaryKey: true },
    origin_key: { type: 'text', notNull: true },
    destination_key: { type: 'text', notNull: true },
    distance_km: { type: 'numeric(10,2)', notNull: true },
    duration_hours: { type: 'numeric(10,2)', notNull: true },
    source: { type: 'text', notNull: true, check: "source IN ('ors','estimate')" },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('route_cache', 'route_cache_pair_unique', 'UNIQUE (origin_key, destination_key)');
  pgm.createIndex('route_cache', ['origin_key', 'destination_key']);

  // comparisons — user_id is nullable (anonymous compare)
  pgm.createTable('comparisons', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      references: '"users"',
      onDelete: 'SET NULL',
    },
    input: { type: 'jsonb', notNull: true },
    result: { type: 'jsonb', notNull: true },
    rate_version_id: {
      type: 'integer',
      notNull: true,
      references: '"rate_versions"',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('comparisons', 'user_id');
  pgm.createIndex('comparisons', 'created_at');

  // saved_comparisons — authenticated bookmarks
  pgm.createTable('saved_comparisons', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'uuid', notNull: true, references: '"users"', onDelete: 'CASCADE' },
    comparison_id: { type: 'uuid', notNull: true, references: '"comparisons"', onDelete: 'CASCADE' },
    label: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('saved_comparisons', 'saved_comparisons_user_comparison_unique', 'UNIQUE (user_id, comparison_id)');
  pgm.createIndex('saved_comparisons', 'user_id');

  // rate_audit_log
  pgm.createTable('rate_audit_log', {
    id: { type: 'serial', primaryKey: true },
    actor_email: { type: 'text', notNull: true },
    action: { type: 'text', notNull: true },
    rate_version_id: { type: 'integer', references: '"rate_versions"' },
    details: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('rate_audit_log', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('rate_audit_log');
  pgm.dropTable('saved_comparisons');
  pgm.dropTable('comparisons');
  pgm.dropTable('route_cache');
  pgm.dropTable('geocode_cache');
  pgm.dropTable('coastal_ports');
  pgm.dropTable('rate_parameters');
  pgm.dropTable('rate_versions');
  pgm.dropTable('users');
  pgm.dropExtension('citext');
};
