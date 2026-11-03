const {test}=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const ts=require('typescript');
test('new invoice lines appear first and existing rows keep their values and selector identity',()=>{
  const refs=[];let cursor=0;const m={exports:{}};
  const compiled=ts.transpileModule(fs.readFileSync('components/facturas/LineasFactura.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  new Function('require','module','exports',compiled)(name=>{
    if(name==='react')return {useRef:value=>refs[cursor++]??(refs[cursor-1]={current:value})};
    if(name==='react/jsx-runtime')return require(name);
    return new Proxy({},{get:(_,key)=>String(key)});
  },m,m.exports);
  let lines=[{producto_id:'mango',descripcion:'Mango',cantidad:20,precio_unitario:1.5,igic:3,es_intercambio:false}];
  const original=lines[0];
  const render=()=>{cursor=0;return m.exports.LineasFactura({lineas:lines,productos:[],onChange:value=>{lines=value}})};
  function flatten(node){if(!node||typeof node!=='object')return [];return [node,...[node.props?.children].flat(Infinity).flatMap(flatten)];}
  const add=tree=>flatten(tree).find(n=>n.type==='Button'&&JSON.stringify(n.props.children).includes('Añadir línea')).props.onClick();
  const rows=tree=>flatten(tree).filter(n=>n.type==='div'&&n.props.className?.startsWith('grid grid-cols-1'));
  let tree=render();const oldKey=rows(tree)[0].key;
  add(tree);tree=render();assert.equal(lines[1],original);assert.equal(lines[0].descripcion,'');assert.equal(rows(tree)[1].key,oldKey);
  lines[0]={...lines[0],descripcion:'Fresa',cantidad:10};const previous=lines[0];
  tree=render();const fresaKey=rows(tree)[0].key;add(tree);tree=render();
  assert.equal(lines[1],previous);assert.equal(lines[2],original);assert.equal(rows(tree)[1].key,fresaKey);assert.equal(rows(tree)[2].key,oldKey);
});
