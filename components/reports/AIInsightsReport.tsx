
import React, { useState, useMemo } from 'react';
import { Sale, OrderType, Product } from '../../types';
import { processSalesData } from '../../utils/analytics';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

const AIInsightsReport = ({ sales, products }: { sales: Sale[], products: Product[] }) => {
  const [aiInsights, setAiInsights] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const isOnline = useOnlineStatus();

  const { kpis, topProducts, orderTypeRevenue } = useMemo(() => {
    return processSalesData(sales, products);
  }, [sales, products]);
  
  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    setError('');
    setAiInsights('');

    try {
        const topProductsWithCategory = topProducts.map(tp => {
            const productInfo = products.find(p => p.name === tp.name);
            return { ...tp, category: productInfo?.category || 'Unknown' };
        });

        const prompt = `
            You are an expert business analyst for a coffee shop named "Cafe Roma". Your task is to analyze the following sales data and provide actionable recommendations.

            **Instructions:**
            1. Analyze the provided sales data summary for all time.
            2. Identify key trends, patterns, and anomalies. Consider the hierarchical category paths (e.g. 'Bakery/Cakes').
            3. Provide specific, actionable recommendations based on your analysis. Focus on:
                *   **Inventory Management**: Suggest which fresh items (e.g., in 'Bakery' or 'Hot Food' categories) we might consider ordering more of based on consistent sales. Also, highlight any slow-moving items from the Top 5 list if applicable.
                *   **Promotional Opportunities**: Suggest potential product bundles or promotions (e.g., "meal deals" combining drinks and food, leveraging the category structure).
                *   **Customer Behavior**: Comment on trends like order type preferences (Eat In vs. Take Away).
            4. Format your response in clear, easy-to-read markdown with headings (using '##') and bullet points (using '*'). Do not use markdown code blocks.

            **Sales Data Summary (All Time):**

            **Key Metrics:**
            - Total Revenue: £${kpis.totalRevenue.toFixed(2)}
            - Total Transactions: ${kpis.transactionCount}
            - Average Sale Value: £${kpis.averageTransaction.toFixed(2)}

            **Top 5 Selling Products (by quantity):**
            ${topProductsWithCategory.length > 0 ? topProductsWithCategory.sort((a,b)=>b.quantity-a.quantity).slice(0,5).map(p => `- ${p.name} (Category Path: ${p.category}): ${p.quantity} sold`).join('\n') : 'No products sold.'}
            
            **Revenue by Order Type:**
            - Eat In: £${orderTypeRevenue[OrderType.EatIn].toFixed(2)}
            - Take Away: £${orderTypeRevenue[OrderType.TakeAway].toFixed(2)}

            Now, provide your analysis and recommendations.
        `;
        
        const url = `/api-proxy/v1beta/models/gemini-2.5-flash:generateContent`;

        const requestBody = {
            contents: [{ parts: [{ text: prompt }] }],
        };

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            throw new Error(errorBody.error?.message || `API request failed with status ${apiResponse.status}`);
        }

        const responseData = await apiResponse.json();
        const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
             throw new Error("The AI returned an empty response. This may be due to content safety filters or an internal model issue.");
        }
        setAiInsights(text);

    } catch (err: any) {
        console.error("Error generating AI insights:", err);
        let detailedError = "Sorry, I was unable to generate insights at this time.";
        if (err.message) {
            if (err.message.toLowerCase().includes('api key not valid')) {
                detailedError += " The API key is invalid.";
            } else if (err.message.toLowerCase().includes('fetch')) {
                detailedError += " A network error occurred.";
            } else {
                detailedError += " An unexpected error occurred."
            }
        }
        setError(`${detailedError} Please check your connection or API key and try again.`);
    } finally {
        setIsGenerating(false);
    }
  };
  
  const renderInsights = (text: string) => {
    return text.split('\n').map((line, index) => {
        line = line.trim();
        if (line.startsWith('## ')) {
            return <h4 key={index} className="text-xl font-bold text-gray-700 mt-4 mb-2">{line.substring(3)}</h4>;
        }
        if (line.startsWith('* ') || line.startsWith('- ')) {
            return <li key={index} className="ml-4 list-disc list-inside mb-1">{line.substring(2)}</li>;
        }
        if (line.trim() === '') {
            return null;
        }
        return <p key={index} className="mb-2">{line}</p>;
    });
  };

  return (
    <div className="p-6 bg-gray-100 min-h-full text-gray-800">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-brand-primary">AI-Powered Insights</h2>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-gray-600">Get data-driven recommendations for your business based on all historical sales data.</p>
                {!isOnline && <p className="text-sm text-yellow-600 font-semibold mt-1">This feature requires an internet connection.</p>}
              </div>
              <button 
                  onClick={handleGenerateInsights}
                  disabled={isGenerating || sales.length === 0 || !isOnline}
                  className="bg-brand-secondary text-brand-dark font-bold py-2 px-4 rounded-md hover:bg-brand-accent disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                  {isGenerating ? 'Generating...' : 'Generate Insights'}
              </button>
          </div>
          <div className="mt-6">
            {isGenerating && (
                 <div className="flex flex-col justify-center items-center rounded-md p-6 bg-gray-50">
                   <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                   <p className="mt-3 text-gray-600">Analyzing your data...</p>
                </div>
            )}
            {error && <p className="text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
            {aiInsights && (
                <div className="p-6 bg-gray-50 rounded-md mt-4 text-gray-700 leading-relaxed prose max-w-none overflow-x-auto">
                    {renderInsights(aiInsights)}
                </div>
            )}
            {!isGenerating && !aiInsights && sales.length === 0 && (
              <p className="text-center text-gray-500 py-10">No data to analyze. Make some sales first!</p>
            )}
             {!isGenerating && !aiInsights && sales.length > 0 && isOnline && (
              <p className="text-center text-gray-500 py-10">Click the button above to generate insights from your sales data.</p>
            )}
             {!isGenerating && !aiInsights && !isOnline && (
              <p className="text-center text-gray-500 py-10">Please connect to the internet to use the AI Insights feature.</p>
            )}
          </div>
      </div>
    </div>
  );
};
export default AIInsightsReport;
