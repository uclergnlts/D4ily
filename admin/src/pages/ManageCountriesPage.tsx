import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useSources } from '../hooks/useSources';
import { Plus, Database, AlertTriangle } from 'lucide-react';

// Currently supported countries (hardcoded for now)
const SUPPORTED_COUNTRIES = [
  { code: 'tr', name: 'Turkey', flag: '🇹🇷', language: 'Turkish' },
  { code: 'de', name: 'Germany', flag: '🇩🇪', language: 'German' },
  { code: 'us', name: 'USA', flag: '🇺🇸', language: 'English' },
];

export function ManageCountriesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCountry, setNewCountry] = useState({ code: '', name: '', flag: '', language: '' });

  const { data: sources } = useSources();

  // Count sources per country
  const getSourceCount = (countryCode: string) => {
    return sources?.filter((s) => s.countryCode === countryCode).length ?? 0;
  };

  const getActiveSourceCount = (countryCode: string) => {
    return sources?.filter((s) => s.countryCode === countryCode && s.isActive).length ?? 0;
  };

  return (
    <div>
      <Header
        title="Manage Countries"
        subtitle="Add and manage countries for news aggregation"
      />

      <div className="p-8">
        {/* Info Card */}
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardContent className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-medium text-amber-800">Adding New Countries</h3>
              <p className="text-sm text-amber-700 mt-1">
                Adding a new country requires database migrations to create article tables.
                Currently, the system supports: Turkey (TR), Germany (DE), and USA (US).
                Contact the development team to add new countries.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Countries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {SUPPORTED_COUNTRIES.map((country) => (
            <Card key={country.code}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="text-3xl">{country.flag}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{country.name}</h3>
                    <p className="text-sm text-gray-500 font-normal">{country.language}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Country Code</span>
                    <Badge>{country.code.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Sources</span>
                    <span className="font-medium">{getSourceCount(country.code)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Active Sources</span>
                    <span className="font-medium text-green-600">{getActiveSourceCount(country.code)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status</span>
                    <Badge variant="success">Active</Badge>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => window.location.href = `/sources/${country.code}`}
                  >
                    Manage Sources
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Country Card */}
          <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[280px] text-center">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-700 mb-2">Add New Country</h3>
              <p className="text-sm text-gray-500 mb-4">
                Requires database setup
              </p>
              <Button
                variant="secondary"
                onClick={() => setIsModalOpen(true)}
              >
                Request New Country
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Database Tables Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Structure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Each country requires the following database tables:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['articles', 'article_sources', 'article_topics', 'article_polls', 'daily_digests'].map((table) => (
                <div key={table} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <code className="text-gray-600">[country]_{table}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request New Country Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Request New Country"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            To add a new country to the news platform, the following steps are required:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Create database migration for new country tables</li>
            <li>Add country to the backend schema</li>
            <li>Update frontend configuration</li>
            <li>Add RSS sources for the new country</li>
          </ol>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Country Details</h4>
            <div className="space-y-3">
              <Input
                label="Country Code (2 letters)"
                placeholder="e.g., fr, jp, br"
                value={newCountry.code}
                onChange={(e) => setNewCountry({ ...newCountry, code: e.target.value.toLowerCase() })}
                maxLength={2}
              />
              <Input
                label="Country Name"
                placeholder="e.g., France, Japan, Brazil"
                value={newCountry.name}
                onChange={(e) => setNewCountry({ ...newCountry, name: e.target.value })}
              />
              <Input
                label="Flag Emoji"
                placeholder="e.g., 🇫🇷, 🇯🇵, 🇧🇷"
                value={newCountry.flag}
                onChange={(e) => setNewCountry({ ...newCountry, flag: e.target.value })}
              />
              <Input
                label="Primary Language"
                placeholder="e.g., French, Japanese, Portuguese"
                value={newCountry.language}
                onChange={(e) => setNewCountry({ ...newCountry, language: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // For now, just show an alert. In production, this would send a request
                alert(`Country request submitted!\n\nCode: ${newCountry.code}\nName: ${newCountry.name}\nFlag: ${newCountry.flag}\nLanguage: ${newCountry.language}\n\nThe development team will review and implement this.`);
                setIsModalOpen(false);
                setNewCountry({ code: '', name: '', flag: '', language: '' });
              }}
              disabled={!newCountry.code || !newCountry.name}
            >
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
