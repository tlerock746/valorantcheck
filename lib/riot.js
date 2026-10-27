// Riot API helper for Vercel Functions. Tokens are processed per request and never persisted.
const https = require("https");
const RPID="e59aa87c-4cbf-517a-5983-6e81511be9b7",CHROMA_TYPE="3ad1b2b2-acdb-4524-852f-954a76ddae0a";
const SKIN_TYPE="e7c63390-eda7-46e0-bb7a-a6abdacd2433",AGENT_TYPE="01bb38e6-da50-4e5b-8dc7-b8e5d9e3d2a8";

function local(lock,p){return new Promise((ok,no)=>{
  const r=https.request({host:"127.0.0.1",port:lock.port,path:p,rejectUnauthorized:false,
    headers:{Authorization:"Basic "+Buffer.from("riot:"+lock.pw).toString("base64")}},x=>{
    let d="";x.on("data",c=>d+=c);x.on("end",()=>{try{ok(JSON.parse(d))}catch{no(new Error("bad response"))}})});
  r.on("error",no);r.end();});}

// shared: t = {accessToken, token, subject}
async function inv(shard,t,alias){
  const ver=(await (await fetch("https://valorant-api.com/v1/version")).json()).data.riotClientVersion;
  const h={Authorization:"Bearer "+t.accessToken,"X-Riot-Entitlements-JWT":t.token,
    "X-Riot-ClientVersion":ver,"X-Riot-ClientPlatform":Buffer.from(JSON.stringify({platformType:"PC",platformOS:"Windows",platformOSVersion:"10.0.19042.1.256.64bit",platformChipset:"Unknown"})).toString("base64")};
  const pd=p=>fetch(`https://pd.${shard}.a.pvp.net${p}`,{headers:h}).then(r=>r.ok?r.json():{});
  const T={skin:SKIN_TYPE,agent:AGENT_TYPE,card:"3f296c07-64c3-494c-923b-fe692a4fa1bd",spray:"d5f120f8-ff8c-4aac-92ea-f2b5acbe9475",buddy:"dd3bf334-87f3-40bd-b043-682a57a8dc3a",title:"de7caa6b-adf7-4588-bbd1-143831e786c6",chroma:CHROMA_TYPE};
  const g=async k=>{const r=await pd(`/store/v1/entitlements/${t.subject}/${T[k]}`);return r.Entitlements?r.Entitlements.map(e=>e.ItemID):null};
  const [skins,agents,cards,sprays,buddies,titles,xp,mmr,offers,wal,chromas]=await Promise.all([g("skin"),g("agent"),g("card"),g("spray"),g("buddy"),g("title"),
    pd(`/account-xp/v1/players/${t.subject}`),pd(`/mmr/v1/players/${t.subject}`),pd("/store/v1/offers/"),pd(`/store/v1/wallet/${t.subject}`),g("chroma")]);
  const B=wal.Balances||{};const bal=id=>B[id]!=null?B[id]:null;
  const prices={},rpc={};(offers.Offers||[]).forEach(o=>{const vp=o.Cost&&o.Cost["85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"],rp=o.Cost&&o.Cost[RPID];(o.Rewards||[]).forEach(r=>{if(vp&&r.ItemTypeID===SKIN_TYPE)prices[r.ItemID]=vp;
    if(rp&&(r.ItemTypeID===SKIN_TYPE||r.ItemTypeID===CHROMA_TYPE))rpc[String(r.ItemID).toLowerCase()]=rp})});
  let rpSpent=0;[...(skins||[]),...(chromas||[])].forEach(i=>{rpSpent+=rpc[String(i).toLowerCase()]||0});
  if(!skins)throw new Error("ดึงสกินไม่ได้ ลองเปลี่ยน Region (shard) ให้ตรงกับไอดี");
  return{name:alias.game_name||"",tag:alias.tag_line||"",level:xp.Progress?.Level||0,
    tier:mmr.LatestCompetitiveUpdate?.TierAfterUpdate||0,rr:mmr.LatestCompetitiveUpdate?.RankedRatingAfterUpdate??null,
    offersN:(offers.Offers||[]).length,rpSpent,rpKnown:Object.keys(rpc).length>0,
    wallet:{vp:bal("85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"),rp:bal("e59aa87c-4cbf-517a-5983-6e81511be9b7"),kc:bal("85ca954a-41f2-ce94-9b45-8ca3dd39a00d")},agents:(agents||[]).length,
    ids:skins,cards:cards||[],sprays:sprays||[],buddies:buddies||[],titles:titles||[],prices};
}

// ---- daily store / night market / accessory store
async function store(shard,t,alias){
  const ver=(await (await fetch("https://valorant-api.com/v1/version")).json()).data.riotClientVersion;
  const h={Authorization:"Bearer "+t.accessToken,"X-Riot-Entitlements-JWT":t.token,"Content-Type":"application/json",
    "X-Riot-ClientVersion":ver,"X-Riot-ClientPlatform":Buffer.from(JSON.stringify({platformType:"PC",platformOS:"Windows",platformOSVersion:"10.0.19042.1.256.64bit",platformChipset:"Unknown"})).toString("base64")};
  const base=`https://pd.${shard}.a.pvp.net`;
  let r=await fetch(`${base}/store/v3/storefront/${t.subject}`,{method:"POST",headers:h,body:"{}"});
  if(!r.ok)r=await fetch(`${base}/store/v2/storefront/${t.subject}`,{headers:h});
  if(!r.ok)throw new Error("ดึงร้านค้าไม่ได้ (Riot ตอบกลับ "+r.status+") ลองเปลี่ยน Region ให้ตรงกับไอดี หรือล็อกอินใหม่");
  const sf=await r.json();
  const wr=await fetch(`${base}/store/v1/wallet/${t.subject}`,{headers:h}),wal=wr.ok?(await wr.json()).Balances||{}:{};
  const VP="85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
  const cost=o=>{const c=o.Cost||{};return c[VP]!=null?c[VP]:Object.values(c)[0]??null};
  const daily=sf.SkinsPanelLayout||{};
  const offers=sf.SkinsPanelLayout?.SingleItemStoreOffers||[];
  const dailyItems=(daily.SingleItemOffers||[]).map(id=>{const o=offers.find(x=>x.OfferID===id);return{id,price:o?cost(o):null}});
  const bonus=sf.BonusStore;
  const night=bonus?(bonus.BonusStoreOffers||[]).map(b=>({id:b.Offer?.Rewards?.[0]?.ItemID||b.Offer?.OfferID,price:cost(b.Offer||{}),
    discounted:b.DiscountCosts?(b.DiscountCosts[VP]??Object.values(b.DiscountCosts)[0]):null,percent:b.DiscountPercent||0})):null;
  const acc=sf.AccessoryStore?(sf.AccessoryStore.AccessoryStoreOffers||[]).map(a=>{const rw=a.Offer?.Rewards?.[0]||{};return{id:rw.ItemID,type:rw.ItemTypeID,price:a.Offer?cost(a.Offer):null,currency:Object.keys(a.Offer?.Cost||{})[0]||""}}):[];
  return{name:alias.game_name||"",tag:alias.tag_line||"",
    daily:dailyItems,dailyLeft:daily.SingleItemOffersRemainingDurationInSeconds??null,
    night,nightLeft:bonus?.BonusStoreRemainingDurationInSeconds??null,
    accessory:acc,accessoryLeft:sf.AccessoryStore?.AccessoryStoreRemainingDurationInSeconds??null,
    wallet:{vp:wal[VP]??null,rp:wal[RPID]??null,kc:wal["85ca954a-41f2-ce94-9b45-8ca3dd39a00d"]??null}};
}


async function fromUrl(shard,url,fn=inv){
  const m=String(url).match(/access_token=([^&\s]+)/);
  if(!m)throw new Error("ไม่พบ access_token ใน URL ต้องคัดลอก URL ทั้งหมดจากแถบที่อยู่หลังล็อกอินเสร็จ (ต้องมีส่วน #access_token=...)");
  const at=decodeURIComponent(m[1]);
  const j=async(u,o)=>{const r=await fetch(u,o);if(!r.ok)throw new Error("Riot ตอบกลับ "+r.status+" (token อาจหมดอายุ ให้ล็อกอินใหม่แล้วคัดลอก URL ใหม่)");return r.json()};
  const e=await j("https://entitlements.auth.riotgames.com/api/token/v1",{method:"POST",headers:{Authorization:"Bearer "+at,"Content-Type":"application/json"},body:"{}"});
  const u=await j("https://auth.riotgames.com/userinfo",{headers:{Authorization:"Bearer "+at}});
  return fn(shard,{accessToken:at,token:e.entitlements_token,subject:u.sub},{game_name:u.acct?.game_name,tag_line:u.acct?.tag_line});
}

module.exports = { inv, store, fromUrl };
