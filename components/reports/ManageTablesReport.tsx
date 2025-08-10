import React, { useState } from 'react';
import { Table } from '../../types';
import Icon from '../Icon';
import { SyncManager } from '../../utils/syncManager';

interface ManageTablesReportProps {
    tables: Table[];
    syncManager: SyncManager;
}

const ManageTablesReport = ({ tables, syncManager }: ManageTablesReportProps) => {
    const [newTableName, setNewTableName] = useState('');
    const [newTableGroup, setNewTableGroup] = useState('');
    const [error, setError] = useState('');

    const handleAddTable = (e: React.FormEvent) => {
        e.preventDefault();
        const name = newTableName.trim();
        const group = newTableGroup.trim();

        if (!name) {
            setError('Table name cannot be empty.');
            return;
        }
        if (tables.some(t => t.name.toLowerCase() === name.toLowerCase())) {
            setError('A table with this name already exists.');
            return;
        }

        syncManager.saveTable({ name, group });
        setNewTableName('');
        setNewTableGroup('');
        setError('');
    };

    const handleDeleteTable = (table: Table) => {
        if (window.confirm(`Are you sure you want to delete table "${table.name}"? This action cannot be undone.`)) {
            syncManager.deleteItem('tables', table.id);
        }
    };

    return (
        <div className="p-6 bg-bg-main min-h-full text-text-primary">
            <h2 className="text-3xl font-bold text-text-primary mb-6">Manage Tables</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Add Table Form */}
                <div className="md:col-span-1 bg-bg-panel p-6 rounded-lg shadow">
                    <h3 className="text-xl font-bold mb-4">Add New Table</h3>
                    <form onSubmit={handleAddTable} className="space-y-4">
                        <div>
                            <label htmlFor="new-table-name" className="block text-sm font-medium text-text-secondary">Table Name</label>
                            <input
                                type="text"
                                id="new-table-name"
                                value={newTableName}
                                onChange={(e) => { setNewTableName(e.target.value); setError(''); }}
                                placeholder="e.g., Table 5"
                                className="mt-1 block w-full px-3 py-2 border border-border-color bg-bg-main rounded-md shadow-sm focus:ring-accent focus:border-accent"
                                required
                            />
                        </div>
                         <div>
                            <label htmlFor="new-table-group" className="block text-sm font-medium text-text-secondary">Group (Optional)</label>
                            <input
                                type="text"
                                id="new-table-group"
                                value={newTableGroup}
                                onChange={(e) => setNewTableGroup(e.target.value)}
                                placeholder="e.g., Patio, Upstairs"
                                className="mt-1 block w-full px-3 py-2 border border-border-color bg-bg-main rounded-md shadow-sm focus:ring-accent focus:border-accent"
                            />
                        </div>
                        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
                        <button
                            type="submit"
                            className="w-full flex justify-center items-center gap-2 bg-accent text-text-on-accent font-semibold py-2 px-4 rounded-lg shadow hover:bg-accent-hover transition-colors"
                        >
                            <Icon name="plus" className="w-5 h-5" />
                            Add Table
                        </button>
                    </form>
                </div>

                {/* Table List */}
                <div className="md:col-span-2 bg-bg-panel p-6 rounded-lg shadow">
                     <h3 className="text-xl font-bold mb-4">Existing Tables ({tables.length})</h3>
                     <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {tables.length > 0 ? (
                            tables.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(table => (
                                <div key={table.id} className="flex items-center justify-between p-3 bg-bg-main rounded-md border border-border-color">
                                    <div>
                                        <p className="font-semibold">{table.name}</p>
                                        {table.group && <p className="text-xs text-text-secondary">{table.group}</p>}
                                    </div>
                                    <button onClick={() => handleDeleteTable(table)} className="text-red-500 hover:text-red-700 p-1" title="Delete Table">
                                        <Icon name="trash" className="w-5 h-5"/>
                                    </button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-text-secondary py-10">No tables created yet. Add one using the form.</p>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default ManageTablesReport;