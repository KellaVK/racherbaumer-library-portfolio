import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { enrichCatalogDVD } from '../../utils/catalogData';
import { createDiscoveryIndex } from '../../utils/discovery';
import { relatedTitles } from '../../utils/collections';
import enrichment from '../../data/catalog-enrichment.json';
import CollectionShelf from './CollectionShelf';
// Cache the public catalog query; private user shelves are never queried here.
let cachedCatalog;
function loadCatalog() {
  if (!cachedCatalog) cachedCatalog = getDocs(collection(db,'dvds')).then(snap=>snap.docs.map(d=>enrichCatalogDVD({id:d.id,...d.data()},enrichment))).catch(error=>{cachedCatalog=null;throw error;});
  return cachedCatalog;
}
export default function RelatedTitles({dvd}) {
  const [catalog,setCatalog]=useState([]);
  useEffect(()=>{let active=true;loadCatalog().then(rows=>{if(active)setCatalog(rows)}).catch(()=>{});return()=>{active=false}},[]);
  const index=useMemo(()=>createDiscoveryIndex(catalog),[catalog]);
  const items=useMemo(()=>relatedTitles(index,dvd),[index,dvd]);
  return <CollectionShelf title="Related titles" description="Similar material and more from these magicians. Check each DVD for current availability." items={items} showAvailability={false}/>;
}
