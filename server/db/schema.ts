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
  // Email verification flow
  emailVerifiedAt: datetime('email_verified_at', { mode: 'date', fsp: 3 }),
  verificationToken: varchar('verification_token', { length: 255 }),
  verificationExpiresAt: datetime('verification_expires_at', { mode: 'date', fsp: 3 }),
  // Password reset flow
  resetToken: varchar('reset_token', { length: 255 }),
  resetExpiresAt: datetime('reset_expires_at', { mode: 'date', fsp: 3 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  emailIdx: unique('users_email_unique').on(table.email),
  usernameIdx: unique('users_username_unique').on(table.username),
}))

export const projects = mysqlTable('projects', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  name: varchar('name', { length: 200 })
      .notNull(),
  description: text('description'),
  // Visibilité publique/privée
  isPublic: int('is_public').notNull().default(1),
  // Nouveau stockage fichier (zip) en base
  fileName: varchar('file_name', { length: 255 }),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: int('file_size'),
  fileData: longblob('file_data', { length: 16_000_000 }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  userIdx: index('projects_user_idx').on(table.userId),
  nameIdx: index('projects_name_idx').on(table.name),
}))

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
}, (table) => ({
  projectIdx: index('project_images_project_idx').on(table.projectId),
}))

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
}, (table) => ({
  userUnique: unique('user_avatars_user_unique').on(table.userId),
}))

export const tags = mysqlTable('tags', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
}, (table) => ({
  nameUnique: unique('tags_name_unique').on(table.name),
}))

export const projectTags = mysqlTable('project_tags', {
  projectId: int('project_id').notNull(),
  tagId: int('tag_id').notNull(),
}, table => ({
  ptUnique: unique('project_tag_unique').on(table.projectId, table.tagId),
  projectIdx: index('pt_project_idx').on(table.projectId),
  tagIdx: index('pt_tag_idx').on(table.tagId),
}))

// Favoris projets par utilisateur
export const projectFavorites = mysqlTable('project_favorites', {
  userId: int('user_id').notNull(),
  projectId: int('project_id').notNull(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
      .notNull().default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => ({
  uniquePerUser: unique('project_fav_user_project_unique').on(table.userId, table.projectId),
  userIdx: index('pf_user_idx').on(table.userId),
  projectIdx: index('pf_project_idx').on(table.projectId),
}))

export const usersRelations = relations(users, ({ many, one }) => ({
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
}, (table) => ({
  userIdx: index('ss_user_idx').on(table.userId),
  uniquePerUser: unique('ss_user_type_query_unique').on(table.userId, table.type, table.query),
}))

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