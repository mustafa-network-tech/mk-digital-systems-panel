import {createClient} from "@/lib/supabase/server";
import {monthRange} from "@/lib/utils";

export type WorkAdvance={id:string;advance_date:string;amount:number;description:string|null};
export type WorkReceipt={id:string;expense_id:string;file_path:string;url?:string};
export type WorkExpense={id:string;expense_date:string;amount:number;description:string;work_advance_receipts:WorkReceipt[]};

export async function getWorkAdvance(month?:string){
  const range=monthRange(month),supabase=await createClient();
  const [{data:advances,error:advanceError},{data:expenses,error:expenseError}]=await Promise.all([
    supabase.from("work_advances").select("id,advance_date,amount,description").gte("advance_date",range.from).lt("advance_date",range.to).order("advance_date",{ascending:false}),
    supabase.from("work_advance_expenses").select("id,expense_date,amount,description,work_advance_receipts(id,expense_id,file_path)").gte("expense_date",range.from).lt("expense_date",range.to).order("expense_date",{ascending:false})
  ]);
  if(advanceError)throw new Error(advanceError.message);if(expenseError)throw new Error(expenseError.message);
  const typed=(expenses||[]) as WorkExpense[];
  await Promise.all(typed.flatMap(expense=>expense.work_advance_receipts.map(async receipt=>{const {data}=await supabase.storage.from("work-advance-receipts").createSignedUrl(receipt.file_path,3600);receipt.url=data?.signedUrl;})));
  return {range,advances:(advances||[]) as WorkAdvance[],expenses:typed};
}
