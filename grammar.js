const expressionExcept = ($, ...excluded) => {
    const expressions = [
        $.id_literal,
        $.int_literal,
        $.float_literal,
        $._string_literal,
        $.char_literal,
        $.func_literal,
        $.struct_literal,
        $.arr_literal,
        $.nested_literal,

        $.binary_expression,
        $.unary_expression,
        $.call_expression,
        $.member_expression,
        $.index_expression,
        $.slice_expression,
        $.compiler_action,
        $.compiler_cast_action,
    ]
    return choice(...expressions.filter(e => !excluded.includes(e)))
}

const typeExcept = ($, ...excluded) => {
    const types = [
        $.id_type,
        $.ptr_type,
        $.arr_ptr_type,
        $.arr_type,
        $.slice_type,
        $.func_type,
        $.module_type,
        $.generic_type,
        $.struct_type,
        $.interface_type,
    ];
    return choice(...types.filter(t => !excluded.includes(t)))
};

const literalExcept = ($, ...excluded) => {
    const literals = [
        $.id_literal,
        $.str_literal,
        $.raw_str_literal,
        $.char_literal,
        $.int_literal,
        $.float_literal,
        $.func_literal,
        $.arr_literal,
        $.struct_literal,
    ];
    return choice(...literals.filter(t => !excluded.includes(t)))
};


module.exports = grammar({
    name: 'naoslang',

    conflicts: $ => [
    ],

    word: $ => $.id_literal,

    rules: {
        source_file: $ => seq(
            // imports are valid only on top of the file
            repeat($._imports),
            repeat($._program),
        ),

        _program: $ => choice(
            $._new_type,
            $.func_def,
            $.global_variable_def,
            $.type_extension,
        ),

        // +------+
        // | Misc |
        // +------+

        not_implemented_syntax: $ => token('\0'),
        pub_keyword: $ => token(prec(2, 'pub')),
        const_keyword: $ => token(prec(2, 'const')),
        let_keyword: $ => token(prec(2, 'let')),


        generic_def_params: $ => _params_wrapper('<', $.id_type_pair, '>'),
        id_type_pair: $ => seq(
            field('name', $.id_literal),
            ':',
            field('type', $._primitive_type),
        ),


        // +-----------------+
        // | Type Extensions |
        // +-----------------+

        type_extension: $ => seq(
            'extends',
            field('name', $.id_literal),
            optional(field('generic_params', $.generic_def_params)),
            $.type_extension_body,
        ),

        type_extension_body: $ => seq(
            '{',
            repeat($.func_def),
            '}',
        ),

        // +-----------+
        // | New Types |
        // +-----------+

        _new_type: $ => choice(
            $.alias_type,
            $.new_type,
        ),

        alias_type: $ => seq(
            optional(field('attributes', $.compiler_attributes)),
            optional(field('pub', $.pub_keyword)),
            'type',
            field('name', $.id_literal),
            '=',
            field('base', $._primitive_type),
            ';',
        ),

        new_type: $ => seq(
            optional(field('attributes', $.compiler_attributes)),
            optional(field('pub', $.pub_keyword)),
            'type',
            field('name', $.id_literal),
            optional(field('generic_params', $.generic_def_params)),
            '::',
            field('base', $._type),
            ';',
        ),


        // +--------------+
        // | Variable_Def |
        // +--------------+

        global_variable_def: $ => seq(
            optional(field('attributes', $.compiler_attributes)),
            optional(field('pub', $.pub_keyword)),
            $._generic_variable,
        ),

        local_variable_def: $ => $._generic_variable,

        _generic_variable: $ => seq(
            field('kind', choice($.const_keyword, $.let_keyword)),
            field('name', $.id_literal),
            ':',
            optional(field('type', $._primitive_type)),
            '=',
            field('value', $._expression),
            ';'
        ),

        // +--------------+
        // | Function Def |
        // +--------------+

        func_def: $ => seq(
            optional(field('attributes', $.compiler_attributes)),
            optional(field('pub', $.pub_keyword)),
            $.func_sign,
            field('body', $.block)
        ),

        func_sign: $ => seq(
            'fn',
            field('name', $.id_literal),
            optional(field('generic_params', $.generic_def_params)),
            field('parameters', $.func_literal_params),
            optional($._func_literal_return),
        ),

        // +----------+
        // | Compiler |
        // +----------+

        compiler_attributes: $ => repeat1($.compiler_attribute),

        compiler_attribute: $ => seq(
            '@',
            field('name', $.id_literal),
            optional(field('arguments', $.compiler_attribute_args)),
        ),

        compiler_attribute_args: $ => seq(
            '(',
            separatedByTrailing(',', $.compiler_attribute_pair),
            ')',
        ),

        compiler_attribute_pair: $ => seq(
            field('key', $.id_literal),
            '=',
            field('value', $._string_literal),
        ),



        compiler_action: $ => seq(
            '@',
            field('name', $.id_literal),
            field('arguments', $.call_expression_args),
        ),



        compiler_cast_action: $ => prec.left(7, seq(
            '@',
            field('name', $.compiler_cast_action_keywords),
            '(',
            field('type', $._primitive_type),
            ',',
            field('value', $._expression),
            ')',
        )),

        compiler_cast_action_keywords: $ => choice('as', 'bitcast'),

        // +-------+
        // | Block |
        // +-------+

        block: $ => seq(
            '{',
            optional($.block_statements),
            '}',
        ),

        block_statements: $ => repeat1($._statement),


        // +------------+
        // | Statements |
        // +------------+

        _statement: $ => choice(
            $.local_variable_def,
        ),

        // +-------------+
        // | Expressions |
        // +-------------+

        _expression: $ => choice(
            expressionExcept($),
            seq('(', $._expression, ')')
        ),



        member_expression: $ => prec.left(8, seq(
            field('parent', $._expression),
            optional(field('generic_arguments', seq('#', $.genric_type_params))),
            '.',
            field('member', $.id_literal),
        )),

        index_expression: $ => prec.left(8, seq(
            field('array', $._expression),
            '[',
            field('index', $._expression),
            ']'
        )),

        slice_expression: $ => prec.left(8, seq(
            field('sliceable', $._expression),
            '[',
            optional(field('start', $._expression)),
            ':',
            optional(field('end', $._expression)),
            ']',
        )),



        call_expression: $ => prec.left(8, seq(
            field('name', $._expression),
            optional(field('generic_arguments', seq('#', $.genric_type_params))),
            field('arguments', $.call_expression_args),
        )),

        call_expression_args: $ => _params_wrapper('(', $._expression, ')'),


        prec6_operators: $ => choice('*', '/', '%'),
        prec5_operators: $ => choice('+', '-', '|', '^', '&^', '&'),
        prec4_operators: $ => choice('<<', '>>'),
        prec3_operators: $ => choice('==', '!=', '<', '>', '<=', '>='),
        prec2_operators: $ => '&&',
        prec1_operators: $ => '||',

        binary_expression: $ => choice(
            prec.left(6, seq(field('left', $._expression), field('op', $.prec6_operators), field('right', $._expression))),
            prec.left(5, seq(field('left', $._expression), field('op', $.prec5_operators), field('right', $._expression))),
            prec.left(4, seq(field('left', $._expression), field('op', $.prec4_operators), field('right', $._expression))),
            prec.left(3, seq(field('left', $._expression), field('op', $.prec3_operators), field('right', $._expression))),
            prec.left(2, seq(field('left', $._expression), field('op', $.prec2_operators), field('right', $._expression))),
            prec.left(1, seq(field('left', $._expression), field('op', $.prec1_operators), field('right', $._expression))),
        ),

        unary_expression: $ => prec(7, choice(
            seq('-', $._expression),
            seq('!', $._expression),
            seq('~', $._expression),
            seq('&', $._expression),
            seq('*', $._expression),
        )),

        // +---------+
        // | Imports |
        // +---------+

        _imports: $ => choice($.global_import, $.alias_import), // all imports

        _generic_import: $ => seq(
            '@',
            'import',
            '(',
            field('path', choice($.str_literal, $.raw_str_literal)),
            ')',
        ),

        global_import: $ => seq('using', $._generic_import, ';'), // using @import(PATH);
        alias_import: $ => seq(field('alias', $.id_literal), '=', $._generic_import, ';'), // id = @import(PATH);


        // +-------+
        // | Types |
        // +-------+

        _type: $ => typeExcept($), // all types
        _primitive_type: $ => typeExcept($, $.struct_type, $.interface_type), // all types expect interfaces and structs



        id_type: $ => alias($.id_literal, $.id_type),
        ptr_type: $ => seq(
            '*',
            optional(field('const', $.const_keyword)),
            field('base', $._primitive_type)
        ), // *PTYPE



        arr_ptr_type: $ => seq(
            '[*]',
            optional(field('const', $.const_keyword)),
            field('base', $._primitive_type)
        ), // [*]PTYPE

        slice_type: $ => seq(
            '[]',
            optional(field('const', $.const_keyword)),
            field('base', $._primitive_type)
        ), // []PTYPE

        arr_type: $ => seq(
            '[',
            field('size', $.int_literal),
            ']',
            optional(field('const', $.const_keyword)),
            field('base', $._primitive_type),
        ), // [N]PTYPE



        func_type_param: $ => seq(
            optional(field('const', $.const_keyword)),
            field('type', $._primitive_type),
        ),

        func_type_params: $ => _params_wrapper('(', $.func_type_param, ')'),
        _func_type_return: $ => seq('->', field('return', $._primitive_type)),

        func_type: $ => seq(
            'fn',
            field('parameters', $.func_type_params),
            optional($._func_type_return),
        ), // fn(PARAMS) -> PTYPE



        module_type: $ => seq(field('module', $.id_literal), '.', field('type', $.id_type)), // id.id



        genric_type_params: $ => _params_wrapper('<', $._primitive_type, '>'),
        generic_type: $ => seq(field('name', choice($.id_type, $.module_type)), field('parameters', $.genric_type_params)), // id<PTYPE...>


        struct_type_members: $ => _params_wrapper('{', optional($.id_type_pair), '}'),
        struct_type: $ => seq(
            'struct',
            field('struct_members', $.struct_type_members)
        ),



        _interface_type_members: $ => choice(
            $.interface_type_members,
            seq(
                'type',
                field('interface_types', $.interface_typed_type_members),
            ),
        ),

        interface_typed_type_members: $ => seq(
            separatedBy('|', $._primitive_type),
            optional(','),
        ),

        interface_type_members: $ => separatedByTrailing(',', choice($.id_literal, $.func_sign)),

        interface_type: $ => seq(
            'interface',
            '{',
            optional(field('interface_members', $._interface_type_members)),
            '}',
        ),

        // +----------+
        // | Literals |
        // +----------+

        _literal: $ => literalExcept($), // all literals
        _string_literal: $ => choice($.str_literal, $.raw_str_literal),



        id_literal: $ => token(/[a-zA-Z_][a-zA-Z0-9_-]*/),



        str_literal: $ => token(seq(
            '"',
            repeat(choice(
                /[^"\\]+/,
                /\\[abfnrtv\\"]/,       // normal escapes
                /\\[0-7]{3}/,           // octal escape
                /\\x[0-9a-fA-F]{2}/,    // hexadecimal escape
                /\\u[0-9a-fA-F]{4}/,    // unicode16 escape
                /\\U[0-9a-fA-F]{8}/,    // unicode32 escape
            )),
            '"',
        )),

        raw_str_literal: $ => token(seq(
            '`',
            repeat(/[^`]/),
            '`',
        )),

        char_literal: $ => token(seq(
            '\'',
            choice(
                /[^'\\]+/,
                /\\[abfnrtv\\']/,
                /\\[0-7]{3}/,
                /\\x[0-9a-fA-F]{2}/,
                /\\u[0-9a-fA-F]{4}/,
                /\\U[0-9a-fA-F]{8}/,
            ),
            '\'',
        )),



        int_literal: $ => token(choice(
            seq('0', choice('x', 'X'), _digits(/[0-9a-fA-F]/)), // hexadecimal integer
            seq(/[1-9]/, repeat(_digits(/[0-9]/))),                     // decimal integer
            seq('0', choice('o', 'O'), _digits(/[0-7]/)),       // octal integer
            seq('0', choice('b', 'B'), _digits(/[0-1]/)),       // binary integer
            '0', // zero becouse is not a valid int literal '013' in octal or decimal base
        )),

        float_literal: $ => token(seq(
            seq(
                _digits(/[0-9]/),
                '.',
                optional(_digits(/[0-9]/)),
                optional(_decimal_exp()),
            ),   // normal float -> 3.14 | 1. | 1.3e5

            seq(
                '.',
                _digits(/[0-9]/),
                optional(_decimal_exp())
            ),  // no start float -> .13 | .3e5
            seq(
                _digits(/[0-9]/),
                _decimal_exp()
            ),  // exp float -> 1e5

        )),



        func_literal_param: $ => seq(
            optional(field('const', $.const_keyword)),
            field('name', $.id_literal),
            ':',
            field('type', $.id_type),
        ),

        func_literal_params: $ => _params_wrapper('(', $.func_literal_param, ')'),
        _func_literal_return: $ => seq('->', field('return', $._primitive_type)),

        func_literal: $ => seq(
            'fn',
            field('parameters', $.func_literal_params),
            optional($._func_literal_return),
            field('body', $.block),
        ),



        arr_literal: $ => seq('[', repeat($.not_implemented_syntax), ']'),



        struct_literal_member: $ => seq(
            optional(field('const', $.const_keyword)),
            field('name', $.id_literal),
            ':',
            field('value', $.not_implemented_syntax) // expression
        ),

        struct_literal_members: $ => _params_wrapper('{', $.struct_literal_member, '}', true),

        struct_literal: $ => seq(
            field('name', $.id_literal),
            field('members', $.struct_literal_members),
        ),



        nested_literal: $ => seq(
            field('name', $.id_literal),
            field('nested', $.struct_literal),
        ),
    }
});

// helper function for int_literal
function _digits(digit_regx) {
    return seq(digit_regx, repeat(seq(optional('_'), digit_regx)))
}

// helper function for float_literal
function _decimal_exp() {
    return seq(
        choice('e', 'E'),
        optional(choice('+', '-')),
        _digits(/[1-9]/)
    )
}

function _params_wrapper(w1, parmaRule, w2, trailing) {
    if (trailing) {
        return seq(w1, optional(separatedByTrailing(',', parmaRule)), w2)
    }
    return seq(w1, optional(separatedBy(',', parmaRule)), w2)
}

function separatedBy(sep, rule) {
    return seq(rule, repeat(seq(sep, rule)))
}

function separatedByTrailing(sep, rule) {
    return seq(rule, repeat(seq(sep, rule)), optional(sep))
}
