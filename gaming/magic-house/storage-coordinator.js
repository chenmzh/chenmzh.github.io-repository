// Web Locks serialize JS, but Chromium localStorage caches can lag across renderers.
// The IndexedDB head is the committed cross-tab fence; localStorage stays the portable
// game save. One IDB readwrite transaction spans head-read, synchronous local write,
// and head-update. Quota/write errors abort before publishing a new head.
export const COORDINATOR_DB = 'magic-house:coordination-v1';
// Called only when the app deliberately creates/recover-resets a local save.
export function clearCoordinatedSave(key) {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(COORDINATOR_DB,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('heads');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;let tx;
      try{tx=db.transaction('heads','readwrite');tx.objectStore('heads').delete(key);}
      catch(error){db.close();reject(error);return;}
      tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>{db.close();reject(tx.error);};
    };
  });
}
// Startup recovery also seeds a committed baseline before the first operation.
// A process can die between the local write and the IDB commit; never display
// that higher, uncommitted local revision as a successfully completed trade.
export function recoverCoordinatedSave(key) {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(COORDINATOR_DB,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('heads');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;let tx,value,failure;
      try{tx=db.transaction('heads','readwrite');}catch(error){db.close();reject(error);return;}
      tx.oncomplete=()=>{db.close();resolve(value);};
      tx.onabort=()=>{db.close();reject(failure||tx.error);};
      const store=tx.objectStore('heads'),read=store.get(key);
      read.onsuccess=()=>{
        try{
          const local=localStorage.getItem(key);value=local;
          if(!local)return;
          const revision=JSON.parse(local).storageRevision||0,head=read.result;
          if(!Number.isSafeInteger(revision)||revision<0||(head&&(!Number.isSafeInteger(head.revision)||head.revision<0||typeof head.raw!=='string')))throw new Error('存档协调版本异常');
          if(head&&head.revision!==revision){value=head.raw;localStorage.setItem(key,value);}
          else if(!head)store.put({revision,raw:local},key);
        }catch(error){failure=error;tx.abort();}
      };
    };
  });
}
export function coordinatedSave(key, operation) {
  return new Promise((resolve,reject) => {
    let request;
    try { request=indexedDB.open(COORDINATOR_DB,1); }
    catch { reject(new Error('并发存档通道不可用，本次未执行。请检查浏览器存储设置。'));return; }
    request.onupgradeneeded=()=>request.result.createObjectStore('heads');
    request.onerror=()=>reject(new Error('并发存档通道不可用，本次未执行。请检查浏览器存储设置。'));
    request.onsuccess=()=>{
      const db=request.result;
      let tx, failure, result, wrote=false, rollbackRaw;
      try { tx=db.transaction('heads','readwrite'); }
      catch { db.close();reject(new Error('并发存档通道不可用，本次未执行。'));return; }
      tx.oncomplete=()=>{db.close();resolve(result);};
      tx.onabort=()=>{
        if(wrote) {
          try { localStorage.setItem(key,rollbackRaw); }
          catch { failure=new Error('存档协调失败且回滚受阻，请停止操作并重新加载页面。'); }
        }
        db.close();reject(failure||new Error('存档协调失败，本次操作未执行。'));
      };
      const store=tx.objectStore('heads'), read=store.get(key);
      read.onsuccess=()=>{
        try {
          const localRaw=localStorage.getItem(key);
          if(!localRaw) throw new Error('存档已在其他页面清除，请重新加载。');
          let revision;
          try { revision=JSON.parse(localRaw).storageRevision||0; }
          catch { throw new Error('存档发生异常，未执行本次操作。请重新加载页面。'); }
          const head=read.result;
          if(!Number.isSafeInteger(revision)||revision<0 || (head && (!Number.isSafeInteger(head.revision)||head.revision<0||typeof head.raw!=='string'))) throw new Error('存档协调版本异常，请重新加载页面。');
          // A higher local revision can also be an aborted write awaiting cache
          // rollback. Only the IDB-committed revision is safe across renderers.
          rollbackRaw=head && head.revision!==revision ? head.raw : localRaw;
          const nextRevision=Math.max(revision,head?.revision||0)+1;
          if(!Number.isSafeInteger(nextRevision))throw new Error('存档版本已达上限。');
          const value=operation(rollbackRaw), updated={...(value.state||value),storageRevision:nextRevision};
          result=value.state?{...value,state:updated}:updated;
          const raw=JSON.stringify(updated);
          try { localStorage.setItem(key,raw); }
          catch { throw new Error('存档写入失败，本次操作未执行，请检查浏览器存储空间。'); }
          wrote=true;
          store.put({revision:nextRevision,raw},key);
        } catch(error) {failure=error;tx.abort();}
      };
    };
  });
}
