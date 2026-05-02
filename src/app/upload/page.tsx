import { UploadForm } from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Upload CV Pelamar</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload PDF atau foto CV. Claude AI akan otomatis ekstrak data dan nilai di 6 dimensi
          berdasarkan kriteria GOKLIRR.
        </p>
      </div>
      <UploadForm />
    </div>
  );
}
