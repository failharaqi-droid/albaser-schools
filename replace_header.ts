import fs from 'fs';

let data = fs.readFileSync('src/components/InvestorManager.tsx', 'utf8');

const oldHeaderStr = `      {/* Main Content View */}
      {viewType === 'electronic' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="بحث في المبالغ المسلمة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pr-12 pl-4 font-black outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2 mr-4">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-gray-50 border border-secondary-200 rounded-xl px-4 py-2 font-black outline-none"
                  />
                </div>
              </div>`;

const newHeaderStr = `      {/* Main Content View */}
      {viewType === 'electronic' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          {/* List Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 lg:p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-100/50 space-y-8 relative overflow-hidden">
               {/* Decorative Gradient Background */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full blur-[80px] -mr-40 -mt-40 opacity-60 pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 w-full bg-gray-50/50 p-4 rounded-[2rem] border border-gray-100">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-400 w-6 h-6" />
                  <input
                    type="text"
                    placeholder="بحث في المبالغ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-[1.5rem] py-4 pr-14 pl-6 font-black text-gray-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto bg-white p-2.5 rounded-[1.5rem] border border-gray-200 shadow-sm">
                  <span className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl mr-1">
                    <Filter className="w-5 h-5" />
                  </span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent border-none text-gray-700 ml-2 font-black outline-none cursor-pointer text-lg"
                  />
                </div>
              </div>`;

if (data.includes(oldHeaderStr)) {
  data = data.replace(oldHeaderStr, newHeaderStr);
  fs.writeFileSync('src/components/InvestorManager.tsx', data);
  console.log('Replaced successfully');
} else {
  console.log('String not found');
}
