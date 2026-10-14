// @vitest-environment node
import {test,expect} from 'vitest';
import {identityMatch,parseSource,parsePublicationIndex} from './sources.js';
import {exportsFor} from './export.js';
const dvd={id:'test',title:'Example Vol. 1',magician:['Alice Example']};
test('requires creator, volume and physical edition agreement',()=>{
 const source={title:'Example Volume 1 DVD by Alice Example',creators:['Alice Example'],format:'DVD'};
 expect(identityMatch(dvd,source).accepted).toBe(true);
 for(const change of [{title:'Example Vol. 2'},{creators:['Bob Example']},{format:'Download'},{format:'Book'},{title:'Example Vol. 1 Remastered'}])expect(identityMatch(dvd,{...source,...change}).accepted).toBe(false);
});
test('archive extracts entry rows, excluding reviews and navigation',()=>{
 const html='<h1>Example</h1><table id="entries"><tbody><tr class="content" data-id="7"><td class="title"><span class="show">A Trick</span></td><td class="creators"><span class="show">Alice Example</span></td><td class="comment"><span class="show">A card travels.</span></td></tr><tr class="content review"><td class="title"><span class="show">A review</span></td></tr></tbody></table>';
 const result=parseSource(html,'https://www.conjuringarchive.com/list/publication/123');
 expect(result.tricks.map(t=>t.name)).toEqual(['A Trick']);expect(result.tricks[0].evidence.entryId).toBe('7');
});
test('retailer extracts explicit contents, without treating marketing or reviews as tricks',()=>{
 const result=parseSource('<h1>Example Vol. 1 DVD by Alice Example</h1><div id="product-description"><h2>Contents</h2><ul><li>A Trick: A card travels.</li></ul><h2>Reviews</h2><ul><li>Best trick ever</li></ul><p>Requires a deck of cards. No coins required.</p></div>','https://www.penguinmagic.com/p/123');
 expect(result.tricks.map(t=>t.name)).toEqual(['A Trick']);expect(result.props).toEqual(['Playing cards']);
});
test('reviewed records always win and conflicting trick credits are withheld',()=>{
 const result={dvdId:'test',title:'Example',creators:['Alice'],status:'matched',sources:[{id:'a',status:'matched',url:'https://www.penguinmagic.com/p/1',tricks:[{name:'A Trick',creator:'Alice'}],props:[]},{id:'b',status:'matched',tricks:[{name:'A Trick',creator:'Bob'}],props:[]}]};
 expect(exportsFor([result]).documents).toEqual([]);
 result.sources.pop();expect(exportsFor([result],{test:{}}).overlay).toEqual({});
 expect(exportsFor([result]).overlay.test.status).toBe('machine_matched_source');
});
