#include "tree_sitter/parser.h"

enum TokenType { COMMENT_MULTILINE };

void *tree_sitter_naoslang_external_scanner_create() { return NULL; }
void tree_sitter_naoslang_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_naoslang_external_scanner_serialize(void *payload,
                                                         char *buffer) {
  return 0;
}
void tree_sitter_naoslang_external_scanner_deserialize(void *payload,
                                                       const char *buffer,
                                                       unsigned length) {}

bool tree_sitter_naoslang_external_scanner_scan(void *payload, TSLexer *lexer,
                                                const bool *valid_symbols) {
  if (!valid_symbols[COMMENT_MULTILINE])
    return false;

  if (lexer->lookahead != '/')
    return false;
  lexer->advance(lexer, false);

  if (lexer->lookahead != '*')
    return false;
  lexer->advance(lexer, false);

  int depth = 1;

  while (depth > 0 && lexer->lookahead != 0) {
    if (lexer->lookahead == '/') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '*') {
        depth++;
        lexer->advance(lexer, false);
      }
    } else if (lexer->lookahead == '*') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '/') {
        depth--;
        lexer->advance(lexer, false);
      }
    } else {
      lexer->advance(lexer, false);
    }
  }

  if (depth == 0) {
    lexer->result_symbol = COMMENT_MULTILINE;
    return true;
  }

  return false;
}
