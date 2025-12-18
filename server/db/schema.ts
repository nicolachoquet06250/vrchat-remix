import {mysqlTable, varchar, text, int, datetime, index, unique, customType} from 'drizzle-orm/mysql-core'
import {relations, sql} from 'drizzle-orm'

type LongBlobProps = {
  data: Buffer
  driverData: Buffer
}

const longblob = customType<LongBlobProps>({
  dataType: ()=> 'longblob',
  // ici tu pourrais compresser, encoder, etc.
  toDriver: (value: Buffer) => value,
  // idem, décompression éventuelle
  fromDriver: (value: Buffer) => value,
});

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  username: varchar('username', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  // Rôle pour modération: 'user' (défaut), 'moderator', 'creator'
  role: varchar('role', { length: 20 }).notNull().default('user'),
  // Désactivation de profil par un creator
  disabledAt: datetime('disabled_at', { mode: 'date', fsp: 3 }),
  // Email verification flow
  emailVerifiedAt: datetime('email_verified_at', { mode: 'date', fsp: 3 }),
  verificationToken: varchar('verification_token', { length: 255 }),
  verificationExpiresAt: datetime('verification_expires_at', { mode: 'date', fsp: 3 }),
  // Flag d'activation 2FA (désactivé par défaut)
  twoFactorEnabled: int('two_factor_enabled').notNull().default(0),
  // Two‑factor auth (email code) flow
  twoFactorToken: varchar('two_factor_token', { length: 255 }),
  twoFactorCodeHash: varchar('two_factor_code_hash', { length: 255 }),
  twoFactorExpiresAt: datetime('two_factor_expires_at', { mode: 'date', fsp: 3 }),
  twoFactorAttempts: int('two_factor_attempts').notNull().default(0),
  // Password reset flow
  resetToken: varchar('reset_token', { length: 255 }),
  resetExpiresAt: datetime('reset_expires_at', { mode: 'date', fsp: 3 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  unique('users_email_unique').on(table.email),
  unique('users_username_unique').on(table.username),
])

export const projects = mysqlTable('projects', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  name: varchar('name', { length: 200 })
      .notNull(),
  description: text('description'),
  // Visibilité publique/privée
  isPublic: int('is_public').notNull().default(1),
  // Compteur de privatisations effectuées par un modérateur
  privateStrikeCount: int('private_strike_count').notNull().default(0),
  lastPrivatedAt: datetime('last_privated_at', { mode: 'date', fsp: 3 }),
  // Lien Github alternatif au zip stocké en base
  githubUrl: varchar('github_url', { length: 300 }),
  // Nouveau stockage fichier (zip) en base
  fileName: varchar('file_name', { length: 255 }),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: int('file_size'),
  fileData: longblob('file_data', { length: 16_000_000 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('projects_user_idx').on(table.userId),
  index('projects_name_idx').on(table.name),
])

// Images associées aux projets
export const projectImages = mysqlTable('project_images', {
  id: int('id').autoincrement().primaryKey(),
  projectId: int('project_id').notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  fileSize: int('file_size').notNull(),
  fileData: longblob('file_data', { length: 16_000_000 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('project_images_project_idx').on(table.projectId),
])

// Avatar utilisateur dans une table séparée, 1:1 avec users
export const userAvatars = mysqlTable('user_avatars', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: int('file_size'),
  fileData: longblob('file_data', { length: 16_000_000 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  unique('user_avatars_user_unique').on(table.userId),
])

export const tags = mysqlTable('tags', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
}, (table) => [
  unique('tags_name_unique').on(table.name),
])

export const projectTags = mysqlTable('project_tags', {
  projectId: int('project_id').notNull(),
  tagId: int('tag_id').notNull(),
}, table => [
  unique('project_tag_unique').on(table.projectId, table.tagId),
  index('pt_project_idx').on(table.projectId),
  index('pt_tag_idx').on(table.tagId),
])

// Favoris projets par utilisateur
export const projectFavorites = mysqlTable('project_favorites', {
  userId: int('user_id').notNull(),
  projectId: int('project_id').notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  unique('project_fav_user_project_unique').on(table.userId, table.projectId),
  index('pf_user_idx').on(table.userId),
  index('pf_project_idx').on(table.projectId),
])

export const usersRelations = relations(users, ({ many }) => ({
  avatar: many(userAvatars),
}))

export const projectsRelations = relations(projects, ({ many }) => ({
  tags: many(projectTags),
  images: many(projectImages)
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  projects: many(projectTags)
}))

export const projectImagesRelations = relations(projectImages, ({ }) => ({}))

export const userAvatarsRelations = relations(userAvatars, ({ one }) => ({
  user: one(users, {
    fields: [userAvatars.userId],
    references: [users.id],
  })
}))

// Recherches sauvegardées pour alertes e‑mail
export const savedSearches = mysqlTable('saved_searches', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  // type de recherche: 'project' (par nom) ou 'tag'
  type: varchar('type', { length: 20 }).notNull(),
  // valeur recherchée (nom partiel ou tag exact, en minuscules)
  query: varchar('query', { length: 200 }).notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('ss_user_idx').on(table.userId),
  unique('ss_user_type_query_unique').on(table.userId, table.type, table.query),
])

// Signalements de projets par des utilisateurs
export const projectReports = mysqlTable('project_reports', {
  id: int('id').autoincrement().primaryKey(),
  projectId: int('project_id').notNull(),
  reporterUserId: int('reporter_user_id').notNull(),
  reason: varchar('reason', { length: 500 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('pr_project_idx').on(table.projectId),
  index('pr_reporter_idx').on(table.reporterUserId),
])

// Analytics: téléchargements de projets
export const downloads = mysqlTable('downloads', {
  id: int('id').autoincrement().primaryKey(),
  projectId: int('project_id').notNull(),
  userId: int('user_id'), // null si anonyme
  // 0/1 pour compat MySQL int
  isAuthenticated: int('is_authenticated').notNull().default(0),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('dl_project_idx').on(table.projectId),
  index('dl_user_idx').on(table.userId),
  index('dl_created_idx').on(table.createdAt),
])

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
export type ProjectImage = typeof projectImages.$inferSelect
export type NewProjectImage = typeof projectImages.$inferInsert
export type UserAvatar = typeof userAvatars.$inferSelect
export type SavedSearch = typeof savedSearches.$inferSelect
export type ProjectReport = typeof projectReports.$inferSelect
export type Download = typeof downloads.$inferSelect