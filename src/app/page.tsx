import AlignerTracker from "@/components/AlignerTracker";

export default function Home() {
  return (
    <main className="container mt-5">
      <div className="text-center mb-4">
        <h1 className="display-4">Controle de Alinhadores</h1>
        <p className="lead">
          Acompanhe o uso dos seus alinhadores Invisalign de forma fácil.
        </p>
      </div>
      <AlignerTracker />
    </main>
  );
}