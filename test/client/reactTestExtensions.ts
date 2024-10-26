import { act } from 'react-dom/test-utils';
let reactRoot;

export const render = (component) => {
  return act(() => reactRoot.render(component));
};