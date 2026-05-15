#!/usr/bin/env node
/**
 * CraftPanel setup wizard — run once to initialize the database and create your admin account.
 * Usage: node setup.js [--demo]
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const SCHEMA = fs.readFileSync(path.join(__dirname, 'backend', 'schema.sql'), 'utf8');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

async function run() {
  console.log('\n  ⬡  CraftPanel Setup Wizard\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('  ✗ DATABASE_URL not set. Copy .env.example to .env and configure it.');
    process.exit(1);
  }

  const db = new Client({ connectionString: dbUrl });
  try {
    await db.connect();
    console.log('  ✓ Connected to PostgreSQL');
  } catch (e) {
    console.error('  ✗ Cannot connect to PostgreSQL:', e.message);
    console.error('    Is docker compose up running? Try: docker compose up -d postgres');
    process.exit(1);
  }

  // Apply schema
  await db.query(SCHEMA);
  console.log('  ✓ Database schema applied');

  const isDemo = process.argv.includes('--demo');
  let groupId, serverId;

  if (isDemo) {
    // Create demo server group and servers
    const existing = await db.query(`SELECT id FROM server_groups WHERE name = 'Demo Group'`);
    if (existing.rows.length === 0) {
      const grp = await db.query(
        `INSERT INTO server_groups (name) VALUES ('Demo Group') RETURNING id`
      );
      groupId = grp.rows[0].id;

      const sv1 = await db.query(
        `INSERT INTO servers (group_id, name, dir_path, ip, port, rcon_port, rcon_password, version)
         VALUES ($1, 'SurvivalCraft', '/home/mc/survival', '127.0.0.1', 25565, 25575, 'changeme123', 'Paper 1.20.4')
         RETURNING id`,
        [groupId]
      );
      serverId = sv1.rows[0].id;

      await db.query(
        `INSERT INTO servers (group_id, name, dir_path, ip, port, rcon_port, rcon_password, version)
         VALUES ($1, 'CreativeHub', '/home/mc/creative', '127.0.0.1', 25566, 25576, 'changeme123', 'Paper 1.20.4')`,
        [groupId]
      );

      console.log('  ✓ Demo servers created (SurvivalCraft, CreativeHub)');
    } else {
      groupId = existing.rows[0].id;
      const sv = await db.query(`SELECT id FROM servers WHERE group_id = $1 LIMIT 1`, [groupId]);
      serverId = sv.rows[0]?.id;
      console.log('  ✓ Demo group already exists');
    }
  } else {
    // Real server setup
    const dataDir = await ask('\n  Where is your craftpanel-data/servers directory?\n  Path (leave blank to skip): ');
    if (dataDir.trim()) {
      const serversDir = dataDir.trim().replace(/\/?servers\/?$/, '') + '/servers';
      if (fs.existsSync(serversDir)) {
        const groups = fs.readdirSync(serversDir, { withFileTypes: true }).filter((d) => d.isDirectory());
        for (const grpDir of groups) {
          const grp = await db.query(
            `INSERT INTO server_groups (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id`,
            [grpDir.name]
          );
          if (!grp.rows[0]) continue;
          groupId = grp.rows[0].id;

          const grpPath = path.join(serversDir, grpDir.name);
          const instances = fs.readdirSync(grpPath, { withFileTypes: true }).filter((d) => d.isDirectory());

          for (const inst of instances) {
            const instPath = path.join(grpPath, inst.name);
            const propsPath = path.join(instPath, 'server.properties');
            let port = 25565, rconPort = 25575, rconPw = '', version = 'Paper 1.20.4';

            if (fs.existsSync(propsPath)) {
              const props = fs.readFileSync(propsPath, 'utf8');
              const get = (k) => { const m = props.match(new RegExp(`^${k}=(.*)$`, 'm')); return m?.[1]?.trim() || ''; };
              port = parseInt(get('server-port')) || port;
              rconPort = parseInt(get('rcon.port')) || rconPort;
              rconPw = get('rcon.password') || rconPw;
            }

            const sv = await db.query(
              `INSERT INTO servers (group_id, name, dir_path, ip, port, rcon_port, rcon_password, version)
               VALUES ($1, $2, $3, '127.0.0.1', $4, $5, $6, $7) RETURNING id`,
              [groupId, `${grpDir.name}/${inst.name}`, instPath, port, rconPort, rconPw, version]
            );
            serverId = sv.rows[0].id;
            console.log(`  ✓ Registered server: ${grpDir.name}/${inst.name} (port ${port})`);
          }
        }
      } else {
        console.log('  ! Directory not found, skipping server scan');
      }
    }

    if (!groupId) {
      const grp = await db.query(`INSERT INTO server_groups (name) VALUES ('My Servers') RETURNING id`);
      groupId = grp.rows[0].id;
      console.log('  ✓ Created default server group "My Servers"');
    }
  }

  // Create admin user
  const existingOwner = await db.query(`SELECT id FROM users WHERE role = 'owner' LIMIT 1`);
  let userId;

  if (existingOwner.rows.length > 0) {
    console.log('  ! Owner account already exists, skipping user creation');
    userId = existingOwner.rows[0].id;
  } else if (isDemo) {
    const hash = await bcrypt.hash('admin123', 12);
    const usr = await db.query(
      `INSERT INTO users (username, password_hash, name, role) VALUES ('admin', $1, 'Server Owner', 'owner') RETURNING id`,
      [hash]
    );
    userId = usr.rows[0].id;
    console.log('  ✓ Demo admin account created: admin / admin123');
  } else {
    console.log('\n  Create your admin account:');
    const username = (await ask('  Username [admin]: ')).trim() || 'admin';
    const displayName = (await ask('  Display name [Server Owner]: ')).trim() || 'Server Owner';
    const password = (await ask('  Password: ')).trim();

    if (!password) { console.error('  ✗ Password cannot be empty'); process.exit(1); }

    const hash = await bcrypt.hash(password, 12);
    const usr = await db.query(
      `INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, 'owner') RETURNING id`,
      [username, hash, displayName]
    );
    userId = usr.rows[0].id;
    console.log(`  ✓ Admin account created: ${username}`);
  }

  // Grant access to all groups
  const allGroups = await db.query(`SELECT id FROM server_groups`);
  for (const { id: gid } of allGroups.rows) {
    await db.query(
      `INSERT INTO user_group_access (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, gid]
    );
  }
  console.log('  ✓ Access granted to all server groups');

  await db.end();
  rl.close();

  const port = process.env.PORT || 3001;
  console.log(`
  ─────────────────────────────────────────
  ✓ Setup complete!

  Start the app:
    npm run dev

  Then open: http://localhost:5173
  ─────────────────────────────────────────
`);
}

run().catch((e) => { console.error('Setup failed:', e); process.exit(1); });
