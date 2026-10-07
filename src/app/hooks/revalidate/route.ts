/**
 * The revalidation webhook again, at an address outside /api.
 *
 * On cPanel/DirectAdmin the Django API can be mounted at /api on the site's own
 * domain. Every /api/* request then goes to Django, including the hook the API
 * itself calls at /api/revalidate, which would never reach this app. Point the
 * API's REVALIDATE_URL at https://<site>/hooks/revalidate in that layout.
 */
export { POST } from '@/app/api/revalidate/route';
