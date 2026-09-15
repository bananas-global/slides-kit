import test from 'node:test';
import assert from 'node:assert/strict';
import {renderDiagram,renderTable} from '../lib/structured.mjs';
test('diagrams escape labels and reject invalid geometry',()=>{
 const spec={nodes:[{id:'a',x:0,y:0,title:'<script>',body:['A & B']}]};
 assert.match(renderDiagram(spec,'one'), /&lt;script&gt;/);
 assert.throws(()=>renderDiagram({nodes:[{id:'a',x:1700,y:0,title:'outside'}]},'x'), /outside/);
});
test('tables escape cells and reject malformed rows',()=>{
 assert.match(renderTable({headers:['A'],rows:[['<x>']]}), /&lt;x&gt;/);
 assert.throws(()=>renderTable({headers:['A'],rows:[['x','y']]}), /row length/);
});
