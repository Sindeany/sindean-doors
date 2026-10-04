# Migration baseline — Phase 0B through Phase 0F

Phase 0B compared the local schema dump with both repository schemas. Phase 0C rehearsed the baseline on disposable local databases only. That rehearsal ran Drizzle `migrate` against `sindian_phase0c_empty` and `sindian_phase0c_copy`. `migrate` was not run against `sindian_doors` or production. Phase 0D copied those verified artifacts into `drizzle/migrations`. `drizzle/schema.ts` was not edited again. The repository `drizzle.config.ts` was not edited. TiDB Cloud was not contacted. Production was not inspected. `sindian_doors` was not modified. The Phase 0D commit records these files in the repository. It does not apply them to `sindian_doors` or production. Phase 0E adds migration `0001`, which changes the foreign key from `CASCADE` to `RESTRICT`. That migration was rehearsed on `sindian_phase0e_copy` only. Phase 0F then applied it to the verified local database `sindian_doors`. It has not been applied to production.

Installed tools: `drizzle-orm` 0.45.2 and `drizzle-kit` 0.31.10. `package.json` still has `pnpm db:push` (`drizzle-kit push`) for local development. That command is not the production migration path. Production changes go through a reviewed file in `drizzle/migrations`, then a staging or test database, then verification, then `migrate`.

## Sources

Three states were kept separate.

| State | Source |
| --- | --- |
| A. Local database | `sindian_doors_schema_baseline.sql`, 37,248 bytes, schema-only dump from Docker container `sindian-mysql`, database `sindian_doors`, MySQL 8.0.46 |
| B. `HEAD` | `git show HEAD:drizzle/schema.ts` |
| C. Working tree | `drizzle/schema.ts` |

`git diff HEAD -- drizzle/schema.ts` changes only `work_orders`. It adds `order_id` `int NOT NULL`, a foreign key to `door_orders.id` with `onDelete: "cascade"`, index `order_id_idx`, and the `index` import. No other table in the schema file differs between B and C.

The dump was parsed from its `CREATE TABLE` statements: columns, types, nullability, defaults, primary keys, single-column unique keys, secondary indexes, and foreign keys. Both schema files were parsed the same way. Drizzle `boolean` was read as `tinyint(1)`, `primaryKey()` as `NOT NULL`, and `defaultNow()` as `now()`.

## Local row facts

These counts were supplied from a prior read-only inspection of this same local database. This phase did not query the database again.

- 39 tables
- `door_orders`: 13 rows
- `work_orders`: 2 rows
- `order_id` nulls: 0
- `order_id` orphans: 0
- valid linked work orders: 2

Both existing local work orders point at a real `door_orders.id`. That is local integrity only. It is not a mapping rule for any other database.

## Result of the comparison

The dump has 39 tables. `HEAD` has those same 39 names. The working tree has those same 39 names. There is no database-only table and no schema-only table.

Against the working tree, all 537 columns match in type, nullability, default, primary key, auto-increment, and single-column uniqueness. The only secondary index in the dump is `order_id_idx`, and the working tree declares it. The only foreign key in the dump is `work_orders_order_id_door_orders_id_fk`, and the working tree declares that same reference and `ON DELETE CASCADE`.

Against `HEAD`, the same columns match except `work_orders.order_id`, which `HEAD` does not declare. `HEAD` also has no `order_id_idx` and no foreign key to `door_orders`.

So, for this local database:

- The actual schema matches the dirty working tree.
- It does not match `HEAD`.
- The working tree is closer only because it contains the column the database already has. It is not a separate history of deployment. `HEAD` plus that one uncommitted `order_id` definition is the whole repository difference.

Tables checked explicitly, all matching the working tree and, except `work_orders`, also matching `HEAD`:

`door_orders`, `work_orders`, `inventory_items`, `inventory_transactions`, `bom`, `bom_items`, `decision_log`, `users`, `user_sessions`, `distributors`, `distributor_sessions`, `suppliers`, `supplier_sessions`, `rfqs`, `purchase_orders`, `tax_invoices`.

`bom_history` matches as well. Comments on `bom_items.item_id` and similar columns say "references" in the schema file, but those are comments. The dump has no foreign key on them, and the schema file does not declare one.

## `work_orders.order_id`

The local database already has the column. Do not add it again.

From the dump:

```sql
`order_id` int NOT NULL,
KEY `order_id_idx` (`order_id`),
CONSTRAINT `work_orders_order_id_door_orders_id_fk`
  FOREIGN KEY (`order_id`) REFERENCES `door_orders` (`id`) ON DELETE CASCADE
```

| | Local database | `HEAD` | Working tree |
| --- | --- | --- | --- |
| Column | `INT NOT NULL` | absent | `int NOT NULL` |
| Index | `order_id_idx` | absent | `order_id_idx` |
| Foreign key | `door_orders(id)`, `ON DELETE CASCADE` | absent | same cascade foreign key |

The local database matches the dirty working tree on this item. `HEAD` does not contain it.

`ON DELETE CASCADE` is the live local rule and the working-tree rule. Deleting a door order can delete the linked work order. The later domain rule is `ON DELETE RESTRICT`. That change is a later explicit corrective migration. It is not part of the baseline, and it was not applied here.

The two local work orders are valid links. Production has not been inspected. Do not assume production has this column, this foreign key, or these row counts.

## Representation-only differences

These are not structural drift. They do not change type, nullability, or the stored default value.

- Every dumped table is `ENGINE=InnoDB`, `CHARSET=utf8mb4`, `COLLATE=utf8mb4_0900_ai_ci`. `schema.ts` does not repeat that.
- `AUTO_INCREMENT` counters are data-dependent and are not in `schema.ts`.
- In the dump, `work_orders.order_id` is the last column. In the working tree it is declared immediately after `id`. Column order is not a behavior change.
- Empty defaults are written `(_utf8mb4'')` or `(_utf8mb4'[]')` in the dump and `""` or `[]` in Drizzle. `timestamp ... defaultNow()` matches `DEFAULT (now())`. `boolean` matches `tinyint(1)`.
- Unique key names in the dump follow `{table}_{column}_unique`. The comparison checked that the same columns are unique, which they are.

No `HEAD`-only column remains after accounting for the encoding of the comparison copy. `git diff` does not change the Arabic defaults on `packing_orders` or `zatca_settings`, and the working-tree file matches the dump on those defaults.

## Dangerous drift

- `ON DELETE CASCADE` can delete a work order when its door order is deleted. Both local work orders are linked, so both are exposed. Do not change the rule in the baseline.
- A push or generate that uses `HEAD` as the desired schema can try to drop `order_id`, `order_id_idx`, and the foreign key, because those objects exist in the database and not in `HEAD`.
- `drizzle-kit generate` with no journal emits the entire schema it reads. Run from `HEAD`, that SQL omits `order_id`. Run from the working tree, the SQL creates `order_id` as part of `work_orders`. Executing either full script on this database is wrong: the tables already exist. Executing an `ADD COLUMN order_id` against this database is also wrong: the column already exists.
- No other column, type, nullability, default, unique key, or foreign key differs between the dump and the working tree. No other destructive drift was found in this dump.

## How a baseline works with this Drizzle version

`drizzle-kit` 0.31.10 has no baseline command. The commands that exist are `generate`, `migrate`, `introspect` (`pull`), `push`, `studio`, `up`, `check`, `drop`, and `export`.

`generate` does not read the database. The first time it runs, with no `drizzle/migrations/meta/_journal.json`, it writes SQL for the whole schema file, plus `meta/_journal.json` and a snapshot JSON. Each journal entry has a `tag`, a `when` timestamp in milliseconds, and breakpoints. Later `generate` diffs `drizzle/schema.ts` against the latest snapshot. If the snapshot already contains `work_orders.order_id`, and the schema file still contains it, the next generate does not emit that column and does not reprint existing tables.

`drizzle-orm` 0.45.2 applies MySQL migrations in `mysql-core/dialect.js` `migrate()`:

1. Read `meta/_journal.json` and each `{tag}.sql`.
2. Hash the file with SHA-256. The migration's timestamp is the journal `when`.
3. `CREATE TABLE IF NOT EXISTS __drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`.
4. Read the latest row by `created_at`.
5. Execute a migration's statements only when there is no row, or when `created_at < when`.
6. Insert `hash` and `when` after the statements run.

The hash is stored. This version does not compare the hash when deciding to skip. The skip is only `created_at < when`. There is no Kit flag that means "mark applied without executing."

That skip rule is the only supported way to keep `migrate` from replaying a baseline onto a database that already has the tables. It is not a documented baseline subcommand. Using it means inserting one row before `migrate` runs:

- table `__drizzle_migrations`, created with the statement above if it does not exist
- `hash` = SHA-256 of the exact baseline SQL file
- `created_at` = that journal entry's `when`

If `created_at` equals `when`, the baseline SQL is not executed. A later migration is executed only when its own `when` is greater. Setting `created_at` to a later time would skip that later migration too. This insert must happen only on a copy, and only after the baseline SQL has been reviewed against the dump.

## Recommended baseline

The trusted baseline is the actual local database, which this dump shows is the working-tree schema, not `HEAD`.

1. Generate the first migration from the schema text that matches the dump. That text is the current working tree, not `HEAD`. Generate into a scratch directory. Do not write the journal into the repository until the SQL has been reviewed.
2. Review it against `sindian_doors_schema_baseline.sql`. It must create 39 tables, include `order_id INT NOT NULL`, `order_id_idx`, and `ON DELETE CASCADE`, and contain no `DROP` and no second `ADD COLUMN order_id`.
3. On a new empty local database, run `migrate` with an empty `__drizzle_migrations` table so the SQL actually runs. Confirm 39 tables and the cascade foreign key.
4. On a restored copy of `sindian_doors`, do not run those `CREATE` statements. Insert the baseline row described above, then run `migrate`, and confirm it skips the baseline. Confirm 13 `door_orders`, 2 `work_orders`, 0 nulls, and 0 orphans.
5. After that review, the journal and snapshot can be checked in. Future `generate` then emits only a later diff.
6. The corrective migration, later, changes `ON DELETE CASCADE` to `ON DELETE RESTRICT`. Its journal `when` must be greater than the baseline `when`. It is not part of the baseline.

Do not generate from `HEAD`. That snapshot would omit `order_id`, and the next generate would try to add a column this database already has.

Do not run `introspect` into `drizzle/schema.ts`. The working tree already matches the dump, and introspect would rewrite the uncommitted file.

## Phase 0C rehearsal result

Phase 0C passed as a local rehearsal. It ran Drizzle `migrate` against the disposable databases `sindian_phase0c_empty` and `sindian_phase0c_copy` only. It did not run `migrate` against `sindian_doors` or production. It did not write to `sindian_doors`, did not contact TiDB Cloud, did not run `pnpm db:push`, and did not change `CASCADE` in the baseline SQL. The repository `drizzle.config.ts` and `drizzle/schema.ts` were not edited. `drizzle/migrations` was not created during Phase 0C.

### Backup

Full schema and data dump, taken with `mysqldump` from container `sindian-mysql`, database `sindian_doors`, MySQL 8.0.46:

`C:\Projects\sindian-phase0c-scratch\sindian_doors_full.sql`

81,444 bytes. It contains `CREATE TABLE \`work_orders\``, `INSERT INTO \`work_orders\``, and `ON DELETE CASCADE`. It does not contain `CREATE DATABASE`. The dump was not restored onto `sindian_doors`. After every later step, `sindian_doors` still had 39 tables, 13 `door_orders`, 2 `work_orders`, and `DELETE_RULE = CASCADE`.

### Disposable databases

Both were created on `sindian-mysql` only.

| Database | Role | Result |
| --- | --- | --- |
| `sindian_phase0c_empty` | Started with 0 tables. Baseline `migrate` created the schema. | 39 application tables, `order_id` `int NOT NULL`, `order_id_idx`, foreign key `CASCADE` / `NO ACTION` |
| `sindian_phase0c_copy` | Restored from the full backup. | Before adoption: 39 tables, 13 `door_orders`, 2 `work_orders`, `order_id` `NOT NULL`, foreign key present, `ON DELETE CASCADE`, 0 nulls, 0 orphans |

The restored copy matched those source facts before any baseline-adoption write. The later `RESTRICT` proof changed only the copy's foreign key, after the adoption test had already passed.

### Baseline generation

`drizzle-kit` 0.31.10 generated from the current working-tree `drizzle/schema.ts` through the scratch config at `C:\Projects\sindian-phase0c-scratch\drizzle.config.ts`. Output stayed in `C:\Projects\sindian-phase0c-scratch\migrations`. Generate did not connect to a database.

Artifacts:

- `0000_lame_silverclaw.sql` — 25,659 bytes
- `meta/_journal.json` — `when` `1791111776489`, tag `0000_lame_silverclaw`
- `meta/0000_snapshot.json` — 124,665 bytes

The SQL has 39 `CREATE TABLE` statements, no `DROP`, and no `DELETE` statement. `work_orders.order_id` is `int NOT NULL`. After the table, the SQL adds:

```sql
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_order_id_door_orders_id_fk`
  FOREIGN KEY (`order_id`) REFERENCES `door_orders`(`id`)
  ON DELETE cascade ON UPDATE no action;
CREATE INDEX `order_id_idx` ON `work_orders` (`order_id`);
```

SHA-256 of that exact file, computed by the installed `readMigrationFiles`, is `bdaa81aae4ca7738d35a74050ce9dcfb79b30396323bee8d6a25d5be88284308`.

### Installed migration metadata behavior

Verified from `drizzle-orm` 0.45.2 source and by running that code:

`migrator.js` `readMigrationFiles` reads `meta/_journal.json`, reads each `{tag}.sql` as one string, splits it on `--> statement-breakpoint` without trimming, sets `folderMillis` to the journal `when`, and sets `hash` to SHA-256 of the whole file.

`mysql-core/dialect.js` `migrate()` then:

1. `CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (id serial primary key, hash text not null, created_at bigint)`.
2. `SELECT id, hash, created_at ... ORDER BY created_at DESC LIMIT 1`.
3. Runs a migration's statements only when there is no row, or when `Number(created_at) < folderMillis`.
4. Inserts `hash` and `folderMillis` only after those statements.

The hash is stored. This version does not compare the hash when deciding to skip. An equal `created_at` skips the file. A larger `created_at` would also skip every later migration whose `when` is not greater.

The rehearsal called `migrate` from `drizzle-orm/mysql2/migrator.js`. The container does not publish port 3306, so each statement was sent with `docker exec -i sindian-mysql`. That adapter does not change the SQL `migrate()` chooses. `BEGIN` and `COMMIT` were separate MySQL sessions. MySQL DDL commits implicitly anyway. On the copy, the skip decision happened inside `migrate()` before any application statement was sent.

### Empty-database test

`migrate` on `sindian_phase0c_empty` executed 39 `CREATE TABLE` statements, the foreign-key `ALTER`, `CREATE INDEX order_id_idx`, and one bookkeeping insert. It left 39 application tables and 537 columns. `work_orders.order_id` is `int NOT NULL`. `order_id_idx` exists. `information_schema` reports `DELETE_RULE = CASCADE` and `UPDATE_RULE = NO ACTION`. The bookkeeping row is the baseline hash and `created_at = 1791111776489`. The Arabic default on `zatca_settings.seller_name` is `سنديان للأبواب الخشبية`.

### Restored-copy adoption test

On `sindian_phase0c_copy` only, the rehearsal created `__drizzle_migrations` and inserted the baseline hash with `created_at = 1791111776489` before `migrate`. `migrate` then sent only:

- `CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\``
- the bookkeeping `SELECT`
- `BEGIN`
- `COMMIT`

It did not send an application `CREATE TABLE`, `ALTER`, or `CREATE INDEX`, and it did not insert a second bookkeeping row. Afterward the copy still had 39 application tables, 13 `door_orders`, 2 `work_orders`, links `(id, order_id)` of `(1, 1)` and `(2, 2)`, 0 nulls, 0 orphans, and `ON DELETE CASCADE`. Every application table kept its row count. `sindian_doors` stayed at 39 / 13 / 2.

### Second generate

The first retry failed before writing SQL. `drizzle-kit` 0.31.10 prefixed the repository working directory onto the absolute scratch `out` path and could not open the snapshot. No migration file was created. The scratch config `out` was changed to the relative path `../sindian-phase0c-scratch/migrations`. The repository config was not changed.

The retry read the working-tree schema and the existing snapshot, reported 39 tables, and printed `No schema changes, nothing to migrate`. The scratch folder still contains only `0000_lame_silverclaw.sql`, `meta/_journal.json`, and `meta/0000_snapshot.json`.

### Representation differences

These are not structural drift. After the empty migrate, `information_schema` matched the restored copy and `sindian_doors` on all 537 columns for type and nullability, on all 58 index entries, and on the one foreign key.

- 95 column-position differences. Drizzle emits declaration order. The dump keeps columns that were added later at the physical end. `work_orders.order_id` is position 2 in the baseline database and position 24 in the restored copy. The same shift appears on `distributors`, `door_orders`, and `tax_invoices`.
- `AUTO_INCREMENT` counters on the empty database are 1. The copy's counters follow its data. The generated SQL does not set those counters.
- Generated SQL does not emit `ENGINE` or `COLLATE`. On this server the created tables are `InnoDB` and `utf8mb4_0900_ai_ci`, the same as the copy.
- Generated SQL writes `ON DELETE cascade ON UPDATE no action`. MySQL stores that as `CASCADE` and `NO ACTION`. The copy's foreign key already had `UPDATE_RULE = NO ACTION`.
- Defaults, including the Arabic `zatca_settings` default, matched after creation. No default or column-extra mismatch remained.

### CASCADE to RESTRICT proof

This was a throwaway proof on `sindian_phase0c_copy` after the adoption test. The baseline SQL was not edited and still says `ON DELETE cascade`. `sindian_doors` was not altered and still has `CASCADE`.

The copy's foreign key was dropped and recreated as `ON DELETE RESTRICT`. `DELETE FROM door_orders WHERE id = 1` was rejected with `ERROR 1451 (23000)`. The copy still has 13 `door_orders`, 2 `work_orders`, 0 nulls, and 0 orphans. Because of this proof, `sindian_phase0c_copy` is no longer a pristine restore. The backup file is the pristine copy.

### Production

Production and TiDB Cloud were not inspected. Do not treat this local MySQL 8.0.46 database as a production copy.

## Phase 0D repository adoption

Phase 0D copied the verified scratch artifacts into the repository without regenerating them. The copy is byte-for-byte. SHA-256 of `drizzle/migrations/0000_lame_silverclaw.sql` is still `bdaa81aae4ca7738d35a74050ce9dcfb79b30396323bee8d6a25d5be88284308`. The journal `when` is still `1791111776489`. The SQL still has 39 `CREATE TABLE` statements, `work_orders.order_id`, `order_id_idx`, and `ON DELETE cascade`, and it has no `DROP`.

Adopted files:

- `drizzle/migrations/0000_lame_silverclaw.sql`
- `drizzle/migrations/meta/_journal.json`
- `drizzle/migrations/meta/0000_snapshot.json`

The working-tree `drizzle/schema.ts` was left as it was. Its only difference from the then-current `HEAD` was `work_orders.order_id` `NOT NULL`, the foreign key to `door_orders.id` with `onDelete: "cascade"`, and `order_id_idx`. Phase 0E later changes that delete rule to `restrict`.

This baseline records the verified current local schema. `ON DELETE CASCADE` is the historical and current behavior of that schema. It is not the final desired rule. The next explicit schema migration changes `CASCADE` to `RESTRICT`. That migration is not in this baseline. Its journal `when` must be greater than `1791111776489`.

Production has not been inspected. TiDB Cloud was not contacted. `sindian_doors` was not modified during Phase 0D. Phase 0D did not run `migrate` or `pnpm db:push`. At the end of Phase 0D, `migrate` had not been run against `sindian_doors` or production.

An existing database must never simply run this baseline `CREATE` SQL. The tables already exist, and replaying the file will fail or, worse, is the wrong operation if any statement is ever changed into a drop or recreate. Before the baseline is marked applied on an existing database, that database's schema has to be verified against this baseline. Only after that verification may its `__drizzle_migrations` table receive one row: `hash` equal to the SHA-256 of this exact SQL file, and `created_at` equal to `1791111776489`. Do not use a later `created_at` to skip every migration. A later value would also skip the future `RESTRICT` migration.

A new empty database can apply the file through `migrate` because its bookkeeping table has no row. That path was rehearsed on `sindian_phase0c_empty` in Phase 0C. It was not repeated in Phase 0D.

`package.json` still exposes `pnpm db:push` for local development. Production schema changes use the reviewed migration file, a staging or test database, verification, and then `migrate`. No package script was added that runs `migrate` against `DATABASE_URL`.

## Phase 0E delete-rule correction

Phase 0E is the first corrective migration after the baseline. `0000_lame_silverclaw.sql` is unchanged and still records `ON DELETE cascade`. Its SHA-256 is still `bdaa81aae4ca7738d35a74050ce9dcfb79b30396323bee8d6a25d5be88284308`.

`drizzle/schema.ts` now declares `onDelete: "restrict"` for `work_orders.order_id`. `drizzle-kit generate` wrote `drizzle/migrations/0001_busy_gravity.sql`. The journal `when` is `1791124370914`, which is greater than the baseline `when`. The SQL is only:

```sql
ALTER TABLE `work_orders` DROP FOREIGN KEY `work_orders_order_id_door_orders_id_fk`;
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_order_id_door_orders_id_fk`
  FOREIGN KEY (`order_id`) REFERENCES `door_orders`(`id`)
  ON DELETE restrict ON UPDATE no action;
```

It does not drop `order_id`, recreate `work_orders`, change data, or drop `order_id_idx`. `ON UPDATE no action` matches the update rule the local foreign key already had.

The rehearsal used a new database, `sindian_phase0e_copy`, restored from the Phase 0C full backup. It was not the earlier proof copy. Before `migrate` it had 39 application tables, 13 `door_orders`, 2 `work_orders`, links `(1, 1)` and `(2, 2)`, 0 nulls, 0 orphans, and `DELETE_RULE = CASCADE`. The baseline bookkeeping row was inserted first. `migrate` then skipped `0000` and ran `0001` once. No application `CREATE TABLE` from `0000` was sent. Afterward the row counts and links were unchanged, `order_id` was still `int NOT NULL`, `order_id_idx` remained, the foreign key still referenced `door_orders`, and `DELETE_RULE` was `RESTRICT`.

`DELETE FROM door_orders WHERE id = 1` was rejected with `ERROR 1451 (23000)`. That door order and its work order remained. Counts stayed 13 and 2.

A second `migrate` sent only the bookkeeping `CREATE TABLE IF NOT EXISTS`, the bookkeeping `SELECT`, `BEGIN`, and `COMMIT`. It did not run `0001` again. `__drizzle_migrations` kept two rows, ordered by `created_at`:

| hash | created_at |
| --- | --- |
| `bdaa81aae4ca7738d35a74050ce9dcfb79b30396323bee8d6a25d5be88284308` | `1791111776489` |
| `f17039370d460ac98ef61fba0c5564cbb1fa18b0dda328832de497a5fd54c3c6` | `1791124370914` |

At the end of Phase 0E, `sindian_doors` had not been migrated. It still had 39 tables, 13 `door_orders`, 2 `work_orders`, `DELETE_RULE = CASCADE`, and no `__drizzle_migrations` table. Production and TiDB Cloud were not inspected. `pnpm db:push` was not run.

## Phase 0F local database adoption

Phase 0F applied the verified history to the local development database only. The target was Docker container `sindian-mysql`, database `sindian_doors`, MySQL 8.0.46. Windows `localhost:3306` is `hasaad-mysql` and was not used. TiDB Cloud was not contacted. `pnpm db:push` was not run.

A new full backup was written before the change:

`C:\Projects\sindian-phase0c-scratch\sindian_doors_pre_0f.sql`

85,695 bytes. It contains `CREATE TABLE \`work_orders\``, `INSERT INTO \`work_orders\``, and `ON DELETE CASCADE`.

Before the write, `sindian_doors` had 39 application tables, 13 `door_orders`, 2 `work_orders`, links `(1, 1)` and `(2, 2)`, 0 nulls, 0 orphans, `order_id` `INT NOT NULL`, `order_id_idx`, a foreign key to `door_orders(id)` with `DELETE_RULE = CASCADE`, and no `__drizzle_migrations` table.

The baseline row was recorded first: hash `bdaa81aae4ca7738d35a74050ce9dcfb79b30396323bee8d6a25d5be88284308`, `created_at` `1791111776489`. `migrate` skipped `0000` and ran `0001` once. No application `CREATE TABLE` from `0000` was sent. The only application change was dropping and recreating `work_orders_order_id_door_orders_id_fk` with `ON DELETE RESTRICT` and `ON UPDATE NO ACTION`.

After migration the same 13 door orders and 2 work orders remained, with the same links, 0 nulls, and 0 orphans. `order_id` is still `INT NOT NULL`. `order_id_idx` remains. The foreign key still references `door_orders(id)`. `DELETE_RULE` is `RESTRICT`.

`__drizzle_migrations` contains exactly:

| hash | created_at |
| --- | --- |
| `bdaa81aae4ca7738d35a74050ce9dcfb79b30396323bee8d6a25d5be88284308` | `1791111776489` |
| `f17039370d460ac98ef61fba0c5564cbb1fa18b0dda328832de497a5fd54c3c6` | `1791124370914` |

`START TRANSACTION; DELETE FROM door_orders WHERE id = 1; ROLLBACK;` was rejected with `ERROR 1451`. The referenced door order and work order remained.

A second `migrate` did not run `0001` again. Row counts stayed unchanged and `DELETE_RULE` stayed `RESTRICT`.

`drizzle-kit generate` after this adoption reported no schema changes. No `0002` was created.

This procedure is specific to this verified local database. It must not be repeated on production or on another existing database until that database has been inspected and shown to match the baseline. Production remains uninspected.
