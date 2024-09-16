import Image from 'next/image';
import { TokenGate } from '@/components/TokenGate';
import { getSession } from '@/utils/session';
import CaringHandDashboard from './internal/page';

/**
 * The revalidate property determine's the cache TTL for this page and
 * all fetches that occur within it. This value is in seconds.
 */

type SearchParams = { [key: string]: string | string[] | undefined };

export const revalidate = 180;

type PageProps = {
  searchParams: SearchParams;
};

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const data = await getSession(searchParams);
  // Console log the data to see what's available
  // You can see these logs in the terminal where
  // you run `yarn dev`
  console.log({ data });
  return (
    <main>
      <CaringHandDashboard />
    </main>
  );
}

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <TokenGate searchParams={searchParams}>
      <Content searchParams={searchParams} />
    </TokenGate>
  );
}
