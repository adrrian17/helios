import { definePlugin, defineRule } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

// Ported from t3code. `typescript/ban-ts-comment` already covers `@ts-*` directives.
const DIRECTIVE_PATTERN = /^[\s*]*(?:oxlint|eslint)-(?:disable|enable)/u;
const EMPTY_COMMENT_PATTERN = /^[\s*]*$/u;

const requireSuppressionReason = defineRule({
  meta: {
    type: "suggestion",
    docs: {
      description: "Require every lint suppression to say why.",
    },
  },
  create(context) {
    const { sourceCode } = context;

    return {
      // oxlint-disable-next-line sonarjs/function-name -- visitor keys are AST node type names.
      Program() {
        const ownLineCommentsByEndLine = new Map<number, ESTree.Comment>();

        for (const comment of sourceCode.getAllComments()) {
          const { line, column } = comment.loc.start;

          if (
            (sourceCode.lines[line - 1] ?? "").slice(0, column).trim() === ""
          ) {
            ownLineCommentsByEndLine.set(comment.loc.end.line, comment);
          }
        }

        const isExplainedAbove = (directive: ESTree.Comment): boolean => {
          let above = ownLineCommentsByEndLine.get(
            directive.loc.start.line - 1
          );

          while (
            above !== undefined &&
            (DIRECTIVE_PATTERN.test(above.value) ||
              EMPTY_COMMENT_PATTERN.test(above.value))
          ) {
            above = ownLineCommentsByEndLine.get(above.loc.start.line - 1);
          }

          return above !== undefined;
        };

        for (const directive of sourceCode.getDisableDirectives().directives) {
          const hasReason =
            directive.type === "enable" ||
            Boolean(directive.justification?.trim()) ||
            isExplainedAbove(directive.node);

          if (!hasReason) {
            context.report({
              loc: directive.node.loc,
              message:
                "Say why: end the directive with `-- reason` or put a comment on the line above.",
            });
          }
        }
      },
    };
  },
});

export default definePlugin({
  meta: { name: "helios" },
  rules: { "require-suppression-reason": requireSuppressionReason },
});
