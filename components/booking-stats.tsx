"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Users, DollarSign, Calendar, BarChart3 } from "lucide-react";
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

interface BookingStats {
  overall: {
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    timeoutBookings: number;
    totalRevenue: number;
    totalSeats: number;
  };
  byZone: Array<{
    _id: string;
    totalSeats: number;
    totalRevenue: number;
  }>;
  monthly: Array<{
    _id: {
      year: number;
      month: number;
    };
    totalBookings: number;
    totalRevenue: number;
    totalSeats: number;
  }>;
}

export function BookingStats() {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${baseURL}/api/bookings/stats`);
      setStats(response.data);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลสถิติได้");
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const formatMonth = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("th-TH", { year: "numeric", month: "long" });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">สถิติการจอง</h3>
          <Button variant="outline" disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            กำลังโหลด...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">สถิติการจอง</h3>
          <Button variant="outline" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            ลองใหม่
          </Button>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">สถิติการจอง</h3>
        <Button variant="outline" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          รีเฟรช
        </Button>
      </div>

      {/* สถิติภาพรวม */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">การจองทั้งหมด</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overall.totalBookings}</div>
            <p className="text-xs text-muted-foreground">รายการ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">การจองที่ยืนยันแล้ว</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.overall.confirmedBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.overall.totalBookings > 0 
                ? `${Math.round((stats.overall.confirmedBookings / stats.overall.totalBookings) * 100)}% ของทั้งหมด`
                : "0% ของทั้งหมด"
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">จำนวนที่นั่งที่จอง</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.overall.totalSeats}</div>
            <p className="text-xs text-muted-foreground">ที่นั่ง</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ยอดเงินรวม</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.overall.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">บาท</p>
          </CardContent>
        </Card>
      </div>

      {/* สถิติตามสถานะ */}
      <Card>
        <CardHeader>
          <CardTitle>สถิติตามสถานะการจอง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.overall.confirmedBookings}</div>
              <p className="text-sm text-muted-foreground">ยืนยันแล้ว</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.overall.pendingBookings}</div>
              <p className="text-sm text-muted-foreground">รอชำระเงิน</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overall.cancelledBookings}</div>
              <p className="text-sm text-muted-foreground">ยกเลิกแล้ว</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.overall.timeoutBookings}</div>
              <p className="text-sm text-muted-foreground">หมดเวลาชำระ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* สถิติตามโซน */}
      {stats.byZone.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>สถิติตามโซน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.byZone.map((zone) => (
                <div key={zone._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">โซน {zone._id}</h4>
                    <p className="text-sm text-muted-foreground">
                      จำนวนที่นั่งที่จองแล้ว
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {zone.totalSeats} ที่นั่ง
                    </div>
                    <p className="text-sm text-muted-foreground">ที่นั่ง</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* สถิติรายเดือน */}
      {stats.monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>สถิติรายเดือน (6 เดือนล่าสุด)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.monthly.map((month, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">
                      {formatMonth(month._id.year, month._id.month)}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {month.totalBookings} การจอง • {month.totalSeats} ที่นั่ง
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(month.totalRevenue)}
                    </div>
                    <p className="text-sm text-muted-foreground">ยอดเงิน</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
