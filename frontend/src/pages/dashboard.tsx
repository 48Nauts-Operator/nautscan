import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link href="/" className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            Back to Home
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { title: "Total Traffic", value: "7,392 MB", change: "+20.1%" },
            { title: "Unique IPs", value: "1,342", change: "+5.2%" },
            { title: "Active Connections", value: "423", change: "+12.5%" },
            { title: "Security Alerts", value: "9", change: "+3" },
          ].map((stat, i) => (
            <div key={i} className="bg-card p-4 rounded-lg border shadow-sm">
              <h2 className="text-sm font-medium text-muted-foreground">{stat.title}</h2>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.change} from last period
              </p>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2 bg-card p-4 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Network Traffic</h2>
            <div className="h-[300px] bg-muted/20 rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Traffic visualization will appear here</p>
            </div>
          </div>
          
          <div className="bg-card p-4 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Geographic Distribution</h2>
            <div className="h-[300px] bg-muted/20 rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Map visualization will appear here</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card p-4 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Connections</h2>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="flex items-center justify-between" key={i}>
                  <div>
                    <p className="font-medium">192.168.1.{i} → 203.0.113.{i * 10}</p>
                    <p className="text-sm text-muted-foreground">
                      {i} minute{i !== 1 ? 's' : ''} ago • {i * 100} KB
                    </p>
                  </div>
                  <div className="text-sm font-medium">TCP</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-card p-4 rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
            <div className="space-y-4">
              {[
                { type: "Port Scan", severity: "High" },
                { type: "Unusual Traffic", severity: "Medium" },
                { type: "Blocked Connection", severity: "Low" }
              ].map((alert, i) => (
                <div className="flex items-center justify-between" key={i}>
                  <div>
                    <p className="font-medium">{alert.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {i + 1} hour{i !== 0 ? 's' : ''} ago
                    </p>
                  </div>
                  <div className={`text-sm font-medium ${
                    alert.severity === "High" ? "text-red-500" : 
                    alert.severity === "Medium" ? "text-orange-500" : "text-blue-500"
                  }`}>
                    {alert.severity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 