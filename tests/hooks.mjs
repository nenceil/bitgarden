export async function resolve(spec, ctx, next) {
  if (['pg', 'bcryptjs', 'nodemailer'].includes(spec)) return { url: new URL(`./stub-${spec}.mjs`, import.meta.url).href, shortCircuit: true };
  return next(spec, ctx);
}
