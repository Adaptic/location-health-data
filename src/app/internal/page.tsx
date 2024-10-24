'use client';

import { useState, useMemo, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { adapticServer } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { MapPin } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

interface HealthResult {
  measure: string;
  data_value: number;
  year: string;
  low_confidence_limit: number;
  high_confidence_limit: number;
  category: string;
  nationwide_value: number | null;
  community_input?: number;
  church_population?: number;
}

export default function CaringHandDashboard() {
  const [city, setCity] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [attendance, setAttendance] = useState<number>(0);
  const [ageDistribution, setAgeDistribution] = useState<number>(70);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [results, setResults] = useState<HealthResult[]>([]);
  const [cdcChartData, setCdcChartData] = useState<any>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<string>('All');
  const [useGeolocation, setUseGeolocation] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const childDistribution = 100 - ageDistribution;

  useEffect(() => {
    if (useGeolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            );
            const data = await response.json();
            setCity(data.city);
            setState(data.principalSubdivisionCode.split('-')[1]);
          } catch (error) {
            console.error('Error fetching location data:', error);
            alert('Error fetching location data. Please enter manually.');
          } finally {
            setIsLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get location. Please enter manually.');
          setIsLoading(false);
          setUseGeolocation(false);
        },
      );
    }
  }, [useGeolocation]);

  const fetchCdcData = async () => {
    try {
      const response = await fetch(
        `${adapticServer}cdc-data?city=${city}&state=${state}`,
      );
      const data = await response.json();

      if (data.city_state_data.length > 0 || data.nationwide_data.length > 0) {
        const nationwideMap = new Map();
        data.nationwide_data.forEach((item: any) => {
          const key = `${item.measure}_${item.year}`;
          nationwideMap.set(key, parseFloat(item.data_value));
        });

        const combinedDataMap = new Map();
        data.city_state_data.forEach((item: any) => {
          const nationwideKey = `${item.measure}_${item.year}`;
          const healthResult: HealthResult = {
            measure: item.measure,
            data_value: parseFloat(item.data_value),
            year: item.year,
            low_confidence_limit: parseFloat(item.low_confidence_limit),
            high_confidence_limit: parseFloat(item.high_confidence_limit),
            category: item.category,
            nationwide_value: nationwideMap.get(nationwideKey) || null,
          };
          combinedDataMap.set(item.measure, healthResult);
        });

        const combinedData: HealthResult[] = Array.from(
          combinedDataMap.values(),
        );
        setResults(combinedData);

        const measures = Array.from(
          new Set(combinedData.map((item) => item.measure)),
        );
        const years = Array.from(
          new Set(combinedData.map((item) => item.year)),
        );

        const datasets = measures.map((measure) => {
          const measureData = combinedData
            .filter((item) => item.measure === measure)
            .sort((a, b) => parseInt(a.year) - parseInt(b.year));

          return {
            label: measure,
            data: measureData.map((item) => item.data_value),
            fill: false,
            borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
            tension: 0.1,
          };
        });

        setCdcChartData({
          labels: years,
          datasets: datasets,
        });
      } else {
        alert('No data found for the given city and state.');
      }
    } catch (error) {
      console.error('Error fetching data from backend:', error);
      alert('Error fetching data. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchCdcData();
    setSubmitted(true);
  };

  const filteredResults = useMemo(() => {
    const filtered = results.filter((item) => {
      const matchMeasure =
        selectedMeasure === 'All' || item.measure === selectedMeasure;
      return matchMeasure;
    });
    return filtered.sort((a, b) => b.data_value - a.data_value);
  }, [results, selectedMeasure]);

  const filteredChartData = useMemo(() => {
    if (!cdcChartData) return null;
    const filteredDatasets = cdcChartData.datasets.filter((dataset: any) => {
      const matchMeasure =
        selectedMeasure === 'All' || dataset.label === selectedMeasure;
      return matchMeasure;
    });
    return { ...cdcChartData, datasets: filteredDatasets };
  }, [cdcChartData, selectedMeasure]);

  const uniqueMeasures = Array.from(
    new Set(results.map((item) => item.measure)),
  );

  // Calculate church population based on prevalence
  const calculateChurchPopulation = (prevalence: number) => {
    return Math.round((prevalence / 100) * attendance);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Health Data Dashboard
      </h1>
      <p className="text-center mb-8">
        Enter your city and state or use geolocation to see community health
        data and trends.
      </p>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Input Data</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Switch
                id="use-geolocation"
                checked={useGeolocation}
                onCheckedChange={setUseGeolocation}
              />
              <Label htmlFor="use-geolocation">Use Geolocation</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City / County</Label>
                <Input
                  id="city"
                  placeholder="Enter city name"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  disabled={useGeolocation || isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State Abbreviation</Label>
                <Input
                  id="state"
                  placeholder="Enter state abbreviation (e.g., AL)"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  disabled={useGeolocation || isLoading}
                />
              </div>
            </div>
            {isLoading && (
              <div className="flex items-center justify-center space-x-2">
                <MapPin className="animate-pulse" />
                <span>Fetching location...</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="attendance">Total Church Attendance</Label>
              <Input
                id="attendance"
                type="number"
                value={attendance}
                onChange={(e) => setAttendance(parseInt(e.target.value, 10))}
                required
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Percent of Adults</Label>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[ageDistribution]}
                onValueChange={(value) => setAgeDistribution(value[0])}
              />
              <p className="text-sm text-muted-foreground">
                Adults: {ageDistribution}%, Children: {childDistribution}%
              </p>
            </div>
            <Button type="submit" className="w-full">
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>

      {submitted && results.length > 0 && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="measureFilter">
                  Filter by Health Concern (Measure)
                </Label>
                <Select
                  value={selectedMeasure}
                  onValueChange={setSelectedMeasure}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a measure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {uniqueMeasures.map((measure, index) => (
                      <SelectItem key={index} value={measure}>
                        {measure}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                Health Data for {city}, {state}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Health Concern</TableHead>
                    <TableHead>Community Input (%)</TableHead>
                    <TableHead>Prevalence (%)</TableHead>
                    <TableHead>US Prevalence (%)</TableHead>
                    <TableHead>Estimated Church Population</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.measure}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="Enter value"
                          value={item.community_input || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setResults((prevResults) =>
                              prevResults.map((res, i) =>
                                i === index
                                  ? { ...res, community_input: value }
                                  : res,
                              ),
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {item.data_value}{' '}
                        {item.nationwide_value !== null && (
                          <span>
                            {item.data_value > item.nationwide_value
                              ? '↑'
                              : '↓'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.nationwide_value !== null
                          ? item.nationwide_value
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {calculateChurchPopulation(item.data_value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Health Data Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredChartData && (
                <Line
                  data={filteredChartData}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interactive Health Outcomes Map</CardTitle>
            </CardHeader>
            <CardContent>
              <iframe
                src="https://experience.arcgis.com/experience/dc15b033b88e423d85808ce04bd7a497/page/Health-Outcomes/?org=cdcarcgis&views=Arthritis&org=cdcarcgis"
                className="w-full h-[600px] border-none"
                title="Interactive Health Outcomes Map"
                allowFullScreen
              ></iframe>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
