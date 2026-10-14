import { it, expect } from 'vitest';
import { validateCapture,matchCapture,captureHash,extractRules,validateFacts,validateBudget,reserveCost } from './extraction.js';
const capture={dvdId:'a',url:'https://www.penguinmagic.com/p/106',pageTitle:'Card Course Vol.1',creator:'Alice',format:'DVD',access:'manual_capture',text:'Trick: Coin across\nProp: Four coins'};
it('validates sources and distinguishes editions and creators',()=>{
 expect(validateCapture(capture)).toBe(capture);
 expect(()=>validateCapture({...capture,url:'https://evil.example/x'})).toThrow();
 expect(matchCapture({title:'Card Course Vol.2',magician:['Alice']},capture).status).toBe('identity_review_required');
 expect(matchCapture({title:'Card Course Vol.1',magician:['Bob']},capture).status).toBe('identity_review_required');
 expect(matchCapture({title:'Card Course Vol.1',magician:['Alice']},capture).status).toBe('identity_candidate');
});
it('extracts only explicit facts with bounded evidence and invalidates changed captures',()=>{
 const result=extractRules(capture);
 expect(validateFacts(result,capture.text)).toHaveLength(2);
 expect(()=>validateFacts({facts:[{kind:'prop',value:'cards',start:0,end:1000}]},capture.text)).toThrow();
 expect(captureHash(capture)).not.toBe(captureHash({...capture,text:'Changed'}));
 expect(extractRules({...capture,text:'An amazing DVD by Alice'}).facts).toEqual([]);
});
it('requires explicit budget configuration and reserves output plus conservative input cost',()=>{
 expect(()=>validateBudget({})).toThrow();
 const config=validateBudget({model:'test-model',inputUsdPerMillion:1,outputUsdPerMillion:5,maxUsd:1,maxCalls:2,maxOutputTokens:1000});
 expect(reserveCost('abc',config)).toBeGreaterThan(.005);
 expect(()=>validateBudget({...config,maxCalls:100})).toThrow();
});
