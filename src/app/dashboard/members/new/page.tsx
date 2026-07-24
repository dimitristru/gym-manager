import NewMemberForm from "./NewMemberForm";

export default function NewMemberPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Νέο μέλος</h1>
        <p className="text-slate-500 text-sm mt-1">Συμπλήρωσε τα στοιχεία του νέου μέλους</p>
      </div>
      <NewMemberForm />
    </div>
  );
}
