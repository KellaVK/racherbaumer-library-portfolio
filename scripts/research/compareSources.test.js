import { it, expect } from 'vitest';
import { compareSources,publishRecord,embeddingDocuments } from './compareSources.js';
import { captureHtml } from './captureHtml.js';
const source=(id,creator='Alice')=>({id,label:id,url:`https://www.penguinmagic.com/p/${id}`,status:'reviewed_match',scope:'DVD volume 1',tricks:[{name:'Coin Flight',creator}],props:['Coins']});
const record=sources=>({dvdId:'a',title:'Course Vol.1',creators:['Alice'],reviewed:true,sources});
it('compares source claims without treating missing entries as disagreement',()=>{
 const result=compareSources(record([source('1'),{...source('2'),tricks:[]}]));
 expect(result.tricks).toHaveLength(1);
 expect(result.tricks[0].agreement).toBe('listed_by_one_source');
 expect(result.conflicts).toEqual([]);
 expect(embeddingDocuments(result)[0].sourceUrls).toEqual(['https://www.penguinmagic.com/p/1']);
});
it('holds conflicting credits and excludes unmatched editions from publication and embeddings',()=>{
 const conflict=compareSources(record([source('1'),source('2','Bob')]));
 expect(publishRecord(conflict,'2026-10-14')).toBeNull();
 expect(embeddingDocuments(conflict)).toEqual([]);
 const held=compareSources(record([{...source('1'),status:'edition_review_required'}]));
 expect(held.tricks).toEqual([]);
 expect(publishRecord(held,'2026-10-14')).toBeNull();
});
it('preserves boundaries and ignores scripts/forms when importing a selected saved section',()=>{
 const metadata={dvdId:'a',url:'https://www.penguinmagic.com/p/1',pageTitle:'Course Vol.1',creator:'Alice',format:'DVD',selector:'#contents'};
 const result=captureHtml('<nav>Other products</nav><div id="contents"><ul><li>Coin Flight</li><li>Coin Return</li></ul><script>throw Error("bad")</script><form>Private form</form></div>',metadata);
 expect(result.text).toBe('Coin Flight\nCoin Return');
 expect(()=>captureHtml('<div></div>',metadata)).toThrow('exactly one');
 expect(()=>captureHtml('<div id="contents">Test</div>',{...metadata,url:'https://example.com'})).toThrow('Unsupported');
});
