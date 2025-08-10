

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Product } from '../../types';
import Icon from '../Icon';
import { SyncManager } from '../../utils/syncManager';

interface ManageProductsReportProps {
    products: Product[];
    onRequestEditProduct: (product: Product) => void;
    onRequestNewProduct: () => void;
    syncManager: SyncManager;
}

export default function ManageProductsReport({
    products,
    onRequestEditProduct,
    onRequestNewProduct,
    syncManager
}: ManageProductsReportProps) {
    const [allCategoryPaths, setAllCategoryPaths] = useState<string[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        if(products) {
            setAllCategoryPaths([...new Set(products.map(p => p.category).filter(Boolean))].sort());
        }
    }, [products]);

    const onDeleteProduct = useCallback(async (product: Product) => {
        if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
            syncManager.deleteItem('products', product.id);
        }
    }, [syncManager]);

    const sortedAndFilteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCategory = categoryFilter === 'all' || (p.category && p.category.startsWith(categoryFilter));
            const matchesSearch = searchTerm === '' || (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesCategory && matchesSearch;
        }).sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    }, [products, categoryFilter, searchTerm]);
    
    const renderContent = () => {
        return (
            <div className="bg-bg-panel rounded-lg shadow">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border-color">
                        <thead className="bg-bg-main">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Category Path</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Price (Eat In)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Redemption Pts</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">Redeemable</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-bg-panel divide-y divide-border-color">
                            {sortedAndFilteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-bg-main">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-primary">{product.name || 'Invalid Name'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{product.category || 'Uncategorized'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-text-primary">£{(product.priceEatIn ?? 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-accent font-semibold">{product.pointsToRedeem || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                        {product.isRedeemable ? <Icon name="checkCircle" className="w-5 h-5 text-green-500 mx-auto" /> : <span className="text-text-secondary">-</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                        <button onClick={() => onRequestEditProduct(product)} className="p-2 text-text-secondary rounded-md hover:bg-bg-main hover:text-text-primary" title="Edit Product">
                                            <Icon name="edit" className="w-5 h-5"/>
                                        </button>
                                        <button onClick={() => onDeleteProduct(product)} className="p-2 text-red-500 rounded-md hover:bg-red-500/10 hover:text-red-400" title="Delete Product">
                                            <Icon name="trash" className="w-5 h-5"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 bg-bg-main min-h-full text-text-primary">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-text-primary">Manage Products</h2>
                <button
                    onClick={onRequestNewProduct}
                    className="flex items-center gap-2 bg-accent text-text-on-accent font-semibold py-2 px-4 rounded-lg shadow hover:bg-accent-hover transition-colors"
                >
                    <Icon name="plus" className="w-5 h-5" />
                    Add New Product
                </button>
            </div>
            <div className="bg-bg-panel p-4 rounded-lg shadow mb-6 flex items-center gap-6">
                 <input 
                    type="text"
                    placeholder="Search by product name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-1/3 p-2 border border-border-color rounded-lg shadow-sm bg-bg-main focus:ring-accent focus:border-accent"
                />
                <div className="flex items-center gap-2">
                    <label htmlFor="categoryFilter" className="text-sm font-medium">Category:</label>
                    <select 
                        id="categoryFilter" 
                        value={categoryFilter} 
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="bg-bg-main border border-border-color text-text-primary text-sm rounded-lg focus:ring-accent focus:border-accent block p-2"
                    >
                        <option value="all">All Categories</option>
                        {allCategoryPaths.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            
            {renderContent()}
        </div>
    );
}