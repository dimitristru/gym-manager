import NewInstructorForm from "./NewInstructorForm";

export default function NewInstructorPage() {
  return (
    <div className="max-w-md">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Νέος γυμναστής</h1>
        <p className="text-slate-500 text-sm mt-1">Προσθήκη γυμναστή στο σύστημα</p>
      </div>
      <NewInstructorForm />
    </div>
  );
}
