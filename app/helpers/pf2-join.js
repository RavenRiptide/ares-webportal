import { helper } from '@ember/component/helper';

// A list as one line: `{{pf2-join list ", "}}`.
export function pf2Join([list, separator]) {
  return (list || []).join(separator === undefined ? ', ' : separator);
}

export default helper(pf2Join);
