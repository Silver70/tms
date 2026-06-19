/**
 * Role slugs — mirror the `roles.slug` values seeded into the database.
 * Used by the `@Roles()` decorator and the JWT payload.
 */
export enum Role {
  Visitor = 'visitor',
  HotelStaff = 'hotel_staff',
  FerryStaff = 'ferry_staff',
  ParkStaff = 'park_staff',
  Admin = 'admin',
}
