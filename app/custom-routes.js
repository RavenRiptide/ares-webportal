export default function setupCustomRoutes(router) {
  // Define your own custom routes here, just as you would in router.js but using 'router' instead of 'this'.
  // For example:
  // router.route('yourroute');
router.route('pf2-feats-charclass', { path: '/pf2/feats/charclass' });
router.route('pf2-feats-ancestry', { path: '/pf2/feats/ancestry' });
router.route('pf2-feats-general', { path: '/pf2/feats/general' });
router.route('pf2-feats-skill', { path: '/pf2/feats/skill' });
router.route('pf2-feats-dedication', { path: '/pf2/feats/dedication' });
}
