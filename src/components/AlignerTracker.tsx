'use client';

import { useState, useEffect } from 'react';
import { Aligner } from '@/types';
import { differenceInDays, addDays, format, parseISO } from 'date-fns';

const SetupForm = ({ onSetupComplete }: { onSetupComplete: (date: string, start: number, end: number) => void }) => {
    const [date, setDate] = useState('');
    const [startAligner, setStartAligner] = useState('');
    const [endAligner, setEndAligner] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (date && startAligner && endAligner) {
            onSetupComplete(date, parseInt(startAligner, 10), parseInt(endAligner, 10));
        }
    };

    return (
        <div className="card shadow-sm">
            <div className="card-body">
                <h2 className="card-title h4">Configuração Inicial</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="appointmentDate" className="form-label">Data da próxima consulta</label>
                        <input type="date" id="appointmentDate" className="form-control" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label htmlFor="startAligner" className="form-label">Alinhador Inicial</label>
                            <input type="number" id="startAligner" className="form-control" value={startAligner} onChange={(e) => setStartAligner(e.target.value)} min="1" required />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label htmlFor="endAligner" className="form-label">Alinhador Final</label>
                            <input type="number" id="endAligner" className="form-control" value={endAligner} onChange={(e) => setEndAligner(e.target.value)} min="1" required />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-100">Iniciar Acompanhamento</button>
                </form>
            </div>
        </div>
    );
};

const AlignerSchedule = ({ aligners, onConfirmChange, onDateEdit }: { aligners: Aligner[], onConfirmChange: (id: number) => void, onDateEdit: (id: number, newDate: string) => void }) => {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newDate, setNewDate] = useState('');

    const currentAlignerIndex = aligners.findIndex(a => !a.actualChangeDate);

    const handleEdit = (aligner: Aligner) => {
        setEditingId(aligner.id);
        setNewDate(format(aligner.actualChangeDate!, 'yyyy-MM-dd'));
    };

    const handleSave = (id: number) => {
        onDateEdit(id, newDate);
        setEditingId(null);
    };

    return (
        <div className="card shadow-sm">
            <div className="card-body">
                <h2 className="card-title h4">Seu Cronograma</h2>
                <ul className="list-group list-group-flush">
                    {aligners.map((aligner, index) => (
                        <li key={aligner.id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="mb-1 fw-bold">Alinhador {aligner.id}</p>
                                    <small>Troca projetada: {format(new Date(aligner.projectedChangeDate), 'dd/MM/yyyy')}</small>
                                    {aligner.actualChangeDate && (
                                        <div className='mt-1'>
                                            {editingId === aligner.id ? (
                                                <div className="d-flex align-items-center">
                                                    <input type="date" className="form-control form-control-sm w-auto" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                                                    <button className="btn btn-outline-primary btn-sm ms-2" onClick={() => handleSave(aligner.id)}>Salvar</button>
                                                    <button className="btn btn-outline-secondary btn-sm ms-1" onClick={() => setEditingId(null)}>Cancelar</button>
                                                </div>
                                            ) : (
                                                <small className="d-block">Trocado em: {format(new Date(aligner.actualChangeDate), 'dd/MM/yyyy')} 
                                                    <button className="btn btn-link btn-sm py-0" onClick={() => handleEdit(aligner)}>Editar</button>
                                                </small>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {index === currentAlignerIndex && (
                                    <button className="btn btn-success" onClick={() => onConfirmChange(aligner.id)}>Troquei Hoje</button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default function AlignerTracker() {
    const [aligners, setAligners] = useState<Aligner[]>([]);
    const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);

    useEffect(() => {
        const savedAligners = localStorage.getItem('aligners');
        const savedAppointmentDate = localStorage.getItem('appointmentDate');
        if (savedAligners && savedAppointmentDate) {
            setAligners(JSON.parse(savedAligners, (key, value) => {
                if (key === 'projectedChangeDate' || key === 'actualChangeDate') return new Date(value);
                return value;
            }));
            setAppointmentDate(new Date(savedAppointmentDate));
        }
    }, []);

    useEffect(() => {
        if (aligners.length > 0 && appointmentDate) {
            localStorage.setItem('aligners', JSON.stringify(aligners));
            localStorage.setItem('appointmentDate', appointmentDate.toISOString());
        }
    }, [aligners, appointmentDate]);

    const recalculateFutureAligners = (baseAligners: Aligner[], fromIndex: number, fromDate: Date) => {
        if (!appointmentDate) return baseAligners;

        const futureAligners = baseAligners.slice(fromIndex + 1);
        if (futureAligners.length === 0) return baseAligners;

        const remainingDays = differenceInDays(appointmentDate, fromDate);
        const daysPerRemaining = remainingDays / futureAligners.length;

        let updatedAligners = [...baseAligners];
        for (let i = 0; i < futureAligners.length; i++) {
            const alignerIndex = fromIndex + 1 + i;
            updatedAligners[alignerIndex].projectedChangeDate = addDays(fromDate, (i + 1) * daysPerRemaining);
        }
        return updatedAligners;
    };

    const handleSetupComplete = (date: string, startId: number, endId: number) => {
        const startDate = new Date();
        const endDate = new Date(date);
        setAppointmentDate(endDate);

        const count = endId - startId + 1;
        const totalDays = differenceInDays(endDate, startDate);
        const daysPerAligner = totalDays / count;

        const newAligners: Aligner[] = [];
        for (let i = 0; i < count; i++) {
            newAligners.push({
                id: startId + i,
                projectedChangeDate: addDays(startDate, (i + 1) * daysPerAligner),
            });
        }
        setAligners(newAligners);
    };

    const handleConfirmChange = (id: number) => {
        let updatedAligners = [...aligners];
        const changedAlignerIndex = updatedAligners.findIndex(a => a.id === id);
        if (changedAlignerIndex === -1) return;

        updatedAligners[changedAlignerIndex].actualChangeDate = new Date();
        updatedAligners = recalculateFutureAligners(updatedAligners, changedAlignerIndex, new Date());
        setAligners(updatedAligners);
    };

    const handleDateEdit = (id: number, newDateStr: string) => {
        let updatedAligners = [...aligners];
        const editedAlignerIndex = updatedAligners.findIndex(a => a.id === id);
        if (editedAlignerIndex === -1) return;

        const newDate = parseISO(newDateStr); // Correctly parse yyyy-MM-dd
        updatedAligners[editedAlignerIndex].actualChangeDate = newDate;

        // After editing a date, we need to find the *last* actual change in chronological order
        // to serve as the anchor for recalculating the future.
        const allChangedAligners = updatedAligners.filter(a => a.actualChangeDate);
        if (allChangedAligners.length === 0) {
            setAligners(updatedAligners);
            return;
        }

        // Find the aligner with the most recent actual change date
        const lastChronologicalChange = allChangedAligners.reduce((latest, current) => {
            return latest.actualChangeDate! > current.actualChangeDate! ? latest : current;
        });
        
        const recalculationAnchorIndex = updatedAligners.findIndex(a => a.id === lastChronologicalChange.id);

        const recalculatedAligners = recalculateFutureAligners(updatedAligners, recalculationAnchorIndex, lastChronologicalChange.actualChangeDate! );
        setAligners(recalculatedAligners);
    };

    if (aligners.length === 0) {
        return <SetupForm onSetupComplete={handleSetupComplete} />;
    }

    return <AlignerSchedule aligners={aligners} onConfirmChange={handleConfirmChange} onDateEdit={handleDateEdit} />;
}
