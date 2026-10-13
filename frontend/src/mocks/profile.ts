import type { Profile } from '../api/profile'

// Same field names as the users table in docs/schema.sql.
export const mockProfile: Profile = {
  id: '3f2b8c1e-5d4a-4e7b-9c21-8a7d6e5f4b3a',
  full_name: 'Nusrat Jahan',
  phone: '01712345678',
  email: 'nusrat@example.com',
  preferred_language: 'bn',
}
