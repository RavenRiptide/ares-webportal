export default function setupCustomRoutes(router) {
  // Define your own custom routes here, just as you would in router.js but using 'router' instead of 'this'.
  // For example:
  // router.route('yourroute');
router.route('pf2-feats-charclass', { path: '/pf2/feats/charclass' });
router.route('pf2-feats-ancestry', { path: '/pf2/feats/ancestry' });
router.route('pf2-feats-general', { path: '/pf2/feats/general' });
router.route('pf2-feats-skill', { path: '/pf2/feats/skill' });
router.route('pf2-feats-dedication', { path: '/pf2/feats/dedication' });
router.route('pf2-encounter', { path: '/pf2/encounter/:id' });
router.route('pf2-actions', { path: '/pf2/actions' });
router.route('pf2-last-roll', { path: '/pf2/last-roll' });
router.route('pf2-creatures', { path: '/pf2/creatures' });
router.route('pf2-creature-new', { path: '/pf2/creatures/new' });
router.route('pf2-creature', { path: '/pf2/creature/:ref' });
router.route('pf2-creature-edit', { path: '/pf2/creature/:ref/edit' });
}
