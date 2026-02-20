"use client";

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from "recharts";
import { Dimension } from "@/lib/questionnaire/kikoQuestions";

// To make labels look nice on the radar chart
const DIMENSION_LABELS: Record<Dimension, string> = {
    AttachmentSecurity: "安全感",
    ConflictRisk: "理智度", // inverted for UI so "Higher = Better/Safer" visually
    RelationshipMaturity: "成熟度",
    PaceAlignment: "慢热度",
    EmotionalNeedIntensity: "独立性" // inverted so high score = high independence
};

export type RadarDataPoint = {
    dimension: string;
    you: number;
    match?: number;
};

interface KikoRadarProps {
    myDims: Record<string, number>;
    matchDims?: Record<string, number>;
}

export default function KikoRadar({ myDims, matchDims }: KikoRadarProps) {

    // Transform DB mapping logic 0-100 into Radar points
    const data: RadarDataPoint[] = Object.keys(DIMENSION_LABELS).map((key) => {
        const dim = key as Dimension;
        let myVal = myDims[dim] || 50;

        // Invert Risk and Need Intensity visually for the chart so 100 looks universally "positive/independent"
        // ConflictRisk 100 (High Risk) -> 0 (Low Reason/Safety)
        // EmotionalNeed 100 (High Need) -> 0 (Low Independence)
        if (dim === "ConflictRisk" || dim === "EmotionalNeedIntensity") {
            myVal = 100 - myVal;
        }

        const point: RadarDataPoint = {
            dimension: DIMENSION_LABELS[dim],
            you: myVal,
        };

        if (matchDims) {
            let mVal = matchDims[dim] || 50;
            if (dim === "ConflictRisk" || dim === "EmotionalNeedIntensity") {
                mVal = 100 - mVal;
            }
            point.match = mVal;
        }

        return point;
    });

    return (
        <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis
                        dataKey="dimension"
                        tick={{ fill: '#4b5563', fontSize: 13, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`${value}分`, ""]}
                        labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                    />

                    {matchDims && <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />}

                    <Radar
                        name="你"
                        dataKey="you"
                        stroke="#f43f5e"
                        fill="#f43f5e"
                        fillOpacity={0.4}
                        isAnimationActive={true}
                    />

                    {matchDims && (
                        <Radar
                            name="对方"
                            dataKey="match"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.4}
                            isAnimationActive={true}
                        />
                    )}
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
