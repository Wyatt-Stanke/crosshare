import { type Root } from 'mdast';
import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export const remarkNoRefs: Plugin = () => {
  return (tree: Root) => {
    visit(tree, { type: 'textDirective' }, (node) => {
      if (node.type !== 'textDirective' || node.name !== 'no-refs') {
        return;
      }
      const data = node.data ?? (node.data = {});
      data.hName = 'span';
      const properties = data.hProperties ?? (data.hProperties = {});
      properties.className = 'no-refs';
    });
  };
};
