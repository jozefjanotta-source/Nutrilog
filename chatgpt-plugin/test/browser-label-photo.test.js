import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');

function range(start,end){
  const a=html.indexOf(start),b=html.indexOf(end,a);
  assert.ok(a>=0&&b>a,start);
  return html.slice(a,b);
}

const context=vm.createContext({Number,String,Math});
vm.runInContext(range('function normalizeNutritionOcr(text)','function labelOcrProgress(message,progress)'),context);

function parsed(text){
  return JSON.parse(JSON.stringify(context.parseNutritionLabelText(text)));
}

test('reads a Slovak nutrition label with decimal commas',()=>{
  assert.deepEqual(parsed(`
    Vyzivove udaje na 100 g
    Energia 450 kJ / 107 kcal
    Tuky 4,5 g
    z toho nasytene mastne kyseliny 3,0 g
    Sacharidy 3,0 g
    z toho cukry 3,0 g
    Bielkoviny 12 g
    Vlaknina 0 g
  `),{cal:107,prot:12,carb:3,fat:4.5,fiber:0,unit:'g'});
});

test('reads an English liquid label and converts kJ when kcal is absent',()=>{
  assert.deepEqual(parsed(`
    Average values per 100 ml
    Energy 268 kJ
    Fat 3.6 g
    Carbohydrates 4.7 g
    Protein 3.3 g
    Fibre 0 g
  `),{cal:64.1,prot:3.3,carb:4.7,fat:3.6,fiber:0,unit:'ml'});
});

test('leaves nutrients null when the photo text does not contain them',()=>{
  assert.deepEqual(parsed('Product name only'),{cal:null,prot:null,carb:null,fat:null,fiber:null,unit:'g'});
});
