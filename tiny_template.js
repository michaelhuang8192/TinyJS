/*
Example

--- template ---
123 is ${123}.
html escape #{"<>"}

<%
x = 1 + 2
y = 3 + 4
%>

%x += 1

%if(x) {
	yes
%} else {
	no
%}

--- equivalent javascript ---
(function(write, include) {
	write('123 is ');
	write(123);
	write('.\nhtml escape ');
	write(escapeHTML("<>"));
	write('\n');
	x = 1 + 2
	y = 3 + 4
	x += 1
	if(x) {
	write(' yes');
	} else {
	write(' no');
	}
})

*/



var gVm = require('vm');
var gPath = require('path');
var gProcess = require('process');
var gFs = require('fs');


function isStatement(code) {
	return (code > 0 && code < 10);
}

function isQuote(code) {
	return (code > 80 && code < 90);
}

function isComment(code) {
	return (code > 90 && code < 100);
}

function parse(s)
{
	/*stack type
		statement:
			1: expression ->> ${x + 1}
			2: single ->> % x = 1
			3: block ->> <%\n x = 1; y = 2; \n%>
			4: expression html ->> #{x + 1}

		quote:
			81: ''
			82: ""
			83: ``

		comment:
			91: //
			92: / *  * /
	*/
	var stk = [];

	var line = 1;
	var chr;
	var top;
	var slash = 0;
	var stmts = [];
	var stmt = null;

	var s = s.replace(/\r/g, '');
	for(var y = 0, i = 0, l = 1; i <= s.length; i++) {
		chr = s[i];
		top = stk[stk.length - 1] || 0;

		//looking for statement
		if(top == 0) {
			if(chr == null) {
				stmt = [0, i, i];

			} if((chr == '$' || chr == '#') && s[i + 1] == '{') {
				if(s[i - 1] != '\\') {
					stk.push(chr == '$' ? 1 : 4);
					stmt = [0, i, i + 2];
				} else
					stmt = [0, i - 1, i];

			} else if(chr == '<' && s[i + 1] == '%') {
				if(s[i - 1] == '\n') {
					stk.push(3);
					stmt = [0, i - 1, s[i + 2] == '\n' ? i + 3 : i + 2];
				} else if(s[i - 1] == '\\' && (s[i - 2] == '\n' || s[i - 2] == '\\' && s[i - 3] == '\n')) {
					stmt = [0, i - 1, i];
				}

			} else if(chr == '%') {
				if(s[i - 1] == '\n') {
					stk.push(2);
					stmt = [0, i - 1, i + 1];
				} else if(s[i - 1] == '\\' && (s[i - 2] == '\n' || s[i - 2] == '\\' && s[i - 3] == '\n')) {
					stmt = [0, i - 1, i];
				}

			}

		} else if(isStatement(top)) {

			if(chr == "'") {
				stk.push(81);
			} else if(chr == '"') {
				stk.push(82);
			} else if(chr == '`') {
				stk.push(83);
			} else if(chr == '/') {
				if(s[i + 1] == '/')
					stk.push(91);
				else if(s[i + 1] == '*')
					stk.push(92);
			} else if(chr == '}') {
				if(top == 1 || top == 4) {
					stk.pop();
					stmt = [top, i, i + 1];
				}
			} else if(chr == '\n' || chr == null) {
				if(top == 2) {
					stk.pop();
					stmt = [top, i, i + 1];
				}
			} else if(s[i - 1] == '\n' && chr == '%' && s[i + 1] == '>') {
				if(top == 3) {
					stk.pop();
					stmt = [top, i - 1, s[i + 2] == '\n' ? i + 3 : i + 2];
				}
			}

		} else if(isQuote(top)) {
			if(slash == 1)
				slash == 2
			else if(chr == '\\')
				slash = 1;
			else
				slash = 0;

			if(slash != 2) {
				var code = 0;
				if(chr == "'")
					code = 81;
				else if(chr == '"')
					code = 82;
				else if(chr == '`')
					code = 83;

				if(code == top) {
					stk.pop();
					slash = 0;
				}
			}

		} else if(isComment(top)) {
			var code = 0;
			if(chr == '\n')
				code = 91;
			else if(chr == '*' && s[i + 1] == '/')
				code = 92;

			if(code == top)
				stk.pop();
		}

		if(stmt != null) {
			if(stmt[0] == 0) {
				if(stmts.length && stmts[stmts.length - 1].type == 0)
					stmts[stmts.length - 1].data.push(s.substring(y, stmt[1]));
				else
					stmts.push({type: stmt[0], data: [s.substring(y, stmt[1])], line: l});
			} else
				stmts.push({type: stmt[0], data: s.substring(y, stmt[1]), line: l});

			y = stmt[2];
			l = line;
			stmt = null;
		}

		if(chr == '\n') line++;

	}

	if(stk.length)
		throw "incompleted template (" + stk[stk.length - 1] + ")";

	return stmts;
}

function build(tmpl_content) {
	var stmts = parse(tmpl_content);

	var s = ['(function(write, include) {\n'];
	for(var i = 0; i < stmts.length; i++) {
		var stmt = stmts[i];

		if(stmt.type == 0) {
			var data = stmt.data.join('');
			if(data.length) s.push("write('" + data.replace(/'/g, "\\'").replace(/\n/g, "\\n") + "');\n");
		} else if(stmt.type == 1)
			s.push("write(" + stmt.data + ");\n");
		else if(stmt.type == 4)
			s.push("write(escapeHTML(" + stmt.data + "));\n");
		else
			s.push(stmt.data + "\n");
	}
	s.push('})');

	return s.join('');
}

//from html-escape
var HTML_ECS = [
[/&/g, '&amp;'],
[/</g, '&lt;'],
[/>/g, '&gt;'],
[/'/g, '&#39;'],
[/"/g, '&quot;'],
];
var HTML_ECS_TEST = /[&<>'"]/;
function escapeHTML(s)
{
    s = String(s);
    
    if(HTML_ECS_TEST.test(s)) {
        return s
        .replace(HTML_ECS[0][0], HTML_ECS[0][1])
        .replace(HTML_ECS[1][0], HTML_ECS[1][1])
        .replace(HTML_ECS[2][0], HTML_ECS[2][1])
        .replace(HTML_ECS[3][0], HTML_ECS[3][1])
        .replace(HTML_ECS[4][0], HTML_ECS[4][1]);
    } else {
        return s;
    }
}

function getFullFilename(cur_dir, fnz)
{
    var n_fnz = gPath.normalize(fnz);
    if(!gPath.isAbsolute(n_fnz)) n_fnz = gPath.join(cur_dir, n_fnz);
    
    return n_fnz;
}

var gContext = {escapeHTML: escapeHTML};
gVm.createContext(gContext);

function include(fnz) {
	var fnz = getFullFilename(this.dirs[this.dirs.length - 1], fnz);
    
    var code = this.cache[fnz];
    if(code === undefined) {
        var script = build(gFs.readFileSync(gPath.join(this.parent._root, fnz), 'utf8'));
        console.log(script);
        code = this.cache[fnz] = gVm.runInContext(script, gContext, {filename: fnz});
    }

    this.dirs.push(gPath.dirname(fnz));
    code.apply(this.ctx, [this.write, this.include]);
    this.dirs.pop();

}

function write(s) {
	this.outstream.push(String(s));
}

function Template(root, debug)
{
	if(!(this instanceof Template)) return new Template(root, debug);

    this._root = root || gProcess.cwd();
    this._debug = debug;
    this._cache = {};
};

Template.prototype.render = function(fnz, ctx) {
    var scope = {
    	dirs: ['/'],
    	cache: this._debug ? {} : this._cache,
    	outstream: [],
    	ctx: ctx,
    	parent: this
    };

    scope.include = include.bind(scope);
    scope.write = write.bind(scope);

    scope.include(fnz);
    return scope.outstream.join('');
}

module.exports = Template;
