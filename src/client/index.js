import React from 'react';
import ReactDOM from 'react-dom/client';
import EpicBurnup from './EpicBurnup';
import EstimatesAnalysis from './EstimatesAnalysis';
import Throughput from './Throughput';
ReactDOM.createRoot(document.getElementById('root')).render(
  <div>
    <h1>Hello World 2</h1>
    <EpicBurnup />
    <EstimatesAnalysis />
    <Throughput />
  </div>
);
