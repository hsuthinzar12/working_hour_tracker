import { NextResponse } from 'next/server'
import { getWorkerSession } from '@/lib/worker-auth'
export async function GET(){
 const worker=await getWorkerSession()
 if(!worker)return NextResponse.json({error:'Not signed in.'},{status:401})
 return NextResponse.json({worker:{name:worker.worker_name,id:worker.worker_id,must_change_password:worker.must_change_password}})
}
