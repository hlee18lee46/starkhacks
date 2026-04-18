import clientPromise from "@/lib/mongodb"
import { ExternalLink, MapPin, Calendar } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Image from "next/image"

// Force dynamic so it fetches new NFTs immediately
export const dynamic = "force-dynamic"

async function getMintedNFTs() {
  const client = await clientPromise
  const db = client.db("drone")
  // Fetch latest 20 NFTs
  const nfts = await db.collection("mintednfts")
    .find({})
    .sort({ savedAt: -1 })
    .limit(20)
    .toArray()
  
  return JSON.parse(JSON.stringify(nfts))
}

export default async function NFTGalleryPage() {
  const nfts = await getMintedNFTs()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-primary mb-2">Inspection Gallery</h1>
          <p className="text-muted-foreground">Blockchain-verified drone inspection snapshots</p>
        </header>

        {nfts.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl">
            <p className="text-muted-foreground">No NFTs minted yet. Start flying!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft: any) => (
              <div key={nft._id} className="group relative bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all">
                {/* Image Container */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <img 
                    src={nft.imageUrl} 
                    alt={nft.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-mono">
                    {nft.symbol}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg leading-tight">{nft.name}</h3>
                    <span className="text-[10px] uppercase tracking-widest text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                      {nft.issueType || 'General'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>X: {parseFloat(nft.dronePosition?.x).toFixed(2)}, Y: {parseFloat(nft.dronePosition?.y).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(nft.savedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="w-full gap-2 text-xs">
                      <a href={nft.explorer} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                        Solana Explorer
                      </a>
                    </Button>
                    <Button asChild variant="secondary" size="sm" className="w-full gap-2 text-xs">
                      <a href={nft.metadataUri} target="_blank" rel="noopener noreferrer">
                        IPFS Metadata
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}