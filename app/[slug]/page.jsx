import {notFound} from 'next/navigation';
import SessionApp from '../../components/SessionApp';
import {SLUG,RESERVED} from '../../lib/server/http';
export const metadata={title:'Domaine XXV — A sua seleção de materiais',robots:{index:false,follow:false}};
export default async function Page({params}){const {slug}=await params;if(!SLUG.test(slug)||RESERVED.has(slug))notFound();return <SessionApp slug={slug}/>;}
