const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const code = ts.transpileModule(fs.readFileSync('lib/invoice-print-pdf.ts', 'utf8') + '\nexport { preserveCopyStamp };', {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
function fixture(decode) {
 const image = { style:{}, decode }
 const label = { offsetWidth:150,offsetHeight:60,className:'copy-label',textContent:'COPIA',replaceWith(value){assert.equal(value,image)} }
 const style = {borderTopWidth:'3px',transform:'matrix(1,0,0,1,0,0)',borderTopLeftRadius:'8px',backgroundColor:'white',borderTopColor:'red',color:'red',fontFamily:'Arial',fontSize:'24px',fontWeight:'700',letterSpacing:'2px',top:'56px'}
 const clone = {querySelector:()=>label,defaultView:{getComputedStyle:()=>style},createElement:()=>image}
 const module={exports:{}}
 vm.runInNewContext(code,{module,exports:module.exports,require,console,document:{querySelector:()=>({querySelector:()=>null})}})
 return { ...module.exports, clone }
}
test('copy stamp capture waits for SVG decoding, including later invoices', async()=>{
 for(let i=0;i<3;i++){
  let complete; const ready=new Promise(resolve=>complete=resolve)
  const {preserveCopyStamp,clone}=fixture(()=>ready)
  let finished=false; const task=preserveCopyStamp(clone).then(()=>finished=true)
  await Promise.resolve(); assert.equal(finished,false)
  complete(); await task; assert.equal(finished,true)
 }
})
test('stamp decode failure rejects instead of producing an unmarked copy', async()=>{
 const {preserveCopyStamp,clone}=fixture(()=>Promise.reject(new Error('decode failed')))
 await assert.rejects(preserveCopyStamp(clone),/decode failed/)
})
test('copy cannot be generated while the displayed document is still original',async()=>{
 const {generateInvoicePrintPDF}=fixture(()=>Promise.resolve())
 await assert.rejects(generateInvoicePrintPDF({fileName:'F1-copia',copy:true,signal:new AbortController().signal}),/copia aún no está preparada/)
})
