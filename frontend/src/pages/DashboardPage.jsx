import React, { useState } from 'react';
import { 
  Plus, 
  Download, 
  TrendingUp, 
  Users, 
  CreditCard, 
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';

// UI Components
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import StatCard from '../components/ui/StatCard';
import Tabs from '../components/ui/Tabs';

// Layout Primitives
import Sidebar from '../components/ui/Sidebar';
import Topbar from '../components/ui/Topbar';
import PageHeader from '../components/ui/PageHeader';

const DashboardPage = ({ addToast }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tableHeaders = ["Transaction", "Date", "Amount", "Status", "Account"];
  const tableData = [
    [
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <Download size={14} />
        </div>
        <span>Apple Services</span>
      </div>,
      "May 12, 2026",
      <span className="font-mono text-white">-$12.99</span>,
      <Badge variant="success">Completed</Badge>,
      "**** 4242"
    ],
    [
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
          <Plus size={14} />
        </div>
        <span>Salary Deposit</span>
      </div>,
      "May 10, 2026",
      <span className="font-mono text-emerald-500">+$4,200.00</span>,
      <Badge variant="success">Completed</Badge>,
      "Main Savings"
    ],
    [
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
          <TrendingUp size={14} />
        </div>
        <span>Stock Investment</span>
      </div>,
      "May 08, 2026",
      <span className="font-mono text-white">-$1,500.00</span>,
      <Badge variant="warning">Pending</Badge>,
      "Investment Acc"
    ]
  ];

  return (
    <div className="min-h-screen bg-bg-dark text-white font-sans selection:bg-emerald-500/30">
      <Sidebar activeId="dashboard" />
      
      <main className="lg:ml-[260px] min-h-screen flex flex-col">
        <Topbar />
        
        <div className="flex-1 p-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <PageHeader 
              title="Dashboard Overview"
              subtitle="Welcome back, Ahmed. Here's what's happening with your accounts today."
              breadcrumbs={["Home", "Dashboard"]}
              actions={
                <>
                  <Button variant="secondary" leftIcon={Download}>Export Data</Button>
                  <Button variant="primary" leftIcon={Plus} onClick={() => setIsModalOpen(true)}>New Transaction</Button>
                </>
              }
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard 
                label="Total Balance" 
                value="MAD 124,592.00" 
                delta="12.5%" 
                icon={TrendingUp} 
                trend="up"
              />
              <StatCard 
                label="Monthly Savings" 
                value="MAD 12,400.00" 
                delta="3.2%" 
                icon={Plus} 
                trend="up"
              />
              <StatCard 
                label="Active Cards" 
                value="4 Cards" 
                icon={CreditCard}
              />
              <StatCard 
                label="Security Score" 
                value="98/100" 
                delta="Stable" 
                icon={ShieldCheck} 
                trend="up"
              />
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-1">
                  <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <h3 className="font-semibold">Recent Transactions</h3>
                    <Tabs 
                      className="border-none w-auto"
                      tabs={[
                        { id: 'all', label: 'All' },
                        { id: 'sent', label: 'Sent' },
                        { id: 'received', label: 'Received' }
                      ]}
                      activeTab={activeTab}
                      onChange={setActiveTab}
                    />
                  </div>
                  <Table 
                    headers={tableHeaders}
                    data={tableData}
                    pagination
                    currentPage={1}
                    totalPages={5}
                  />
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="p-6 space-y-4">
                  <h3 className="font-semibold mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => addToast("Link copied to clipboard", "info")}>Copy IBAN</Button>
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => addToast("Card frozen successfully", "error")}>Freeze Card</Button>
                    <Button variant="primary" size="sm" className="w-full col-span-2" onClick={() => addToast("Transfer initiated")}>Quick Transfer</Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Your Limits</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Daily ATM Withdrawal</span>
                        <span>MAD 5,000 / 10,000</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Online Shopping</span>
                        <span>MAD 12,000 / 50,000</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 w-1/4" />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card glass className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Upgrade to Gold</h4>
                    <p className="text-xs text-slate-400 mt-1">Get exclusive benefits and higher limits for your daily operations.</p>
                  </div>
                  <Button variant="primary" size="sm" className="w-full">Learn More</Button>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="New Transaction"
      >
        <div className="space-y-6">
          <Input 
            label="Recipient Name" 
            placeholder="e.g. Youssef Alami" 
            leftIcon={Users}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Amount (MAD)" 
              placeholder="0.00" 
              type="number"
            />
            <Select label="Account">
              <option>Main Savings (...4242)</option>
              <option>Business (...8812)</option>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" onClick={() => {
              setIsModalOpen(false);
              addToast("Transaction sent successfully!");
            }}>Send Money</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardPage;
