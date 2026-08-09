export type Project={id:string;name:string;short_name:string|null;description:string|null;customer_id:string|null;status:string;favorite:boolean;critical:boolean;archived:boolean;health_status:string;last_backup_at:string|null;updated_at:string;live_url:string|null;customers?:{name:string}|null};
export type Customer={id:string;name:string;contact_person:string|null;phone:string|null;email:string|null;website:string|null;notes:string|null};
export type Domain={id:string;domain:string;registrar:string|null;expiry_date:string|null;auto_renew:boolean;projects?:{name:string}|null};
export type FinanceCategory={id:string;name:string;type:"income"|"expense";color:string|null};
export type Income={id:string;amount:number;income_date:string;source:string|null;description:string|null;recurring:boolean;finance_categories?:{name:string}|null};
export type Expense={id:string;amount:number;expense_date:string;payment_method:string|null;description:string|null;recurring:boolean;installment_id:string|null;finance_categories?:{name:string}|null};
export type Installment={id:string;name:string;total_amount:number;installment_count:number;installment_amount:number;paid_installment_count:number;start_date:string;next_payment_date:string|null;payment_day:number;payment_method:string|null;description:string|null;status:"active"|"completed"|"overdue"};
