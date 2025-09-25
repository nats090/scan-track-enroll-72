import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Settings, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
const HomePage = () => {
  return <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/20 p-4 flex items-center justify-center bg-transparent">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-primary mb-2">
            Notre Dame of Kidapawan College
          </h2>
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Library Attendance System
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose your access level to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Check In */}
          <Link to="/check-in">
            <Card className="hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-primary text-primary-foreground cursor-pointer">
              <CardHeader className="text-center py-[30px]">
                <LogIn size={48} className="mx-auto mb-2" />
                <CardTitle className="text-2xl">Check In</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-[17px]">
                <p className="text-lg">Enter the library</p>
                <p className="text-sm opacity-90 mt-2">Scan your student ID to check in</p>
              </CardContent>
            </Card>
          </Link>

          {/* Check Out */}
          <Link to="/check-out">
            <Card className="hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-destructive text-destructive-foreground cursor-pointer">
              <CardHeader className="text-center py-[30px]">
                <LogOut size={48} className="mx-auto mb-2" />
                <CardTitle className="text-2xl">Check Out</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-[17px]">
                <p className="text-lg">Exit the library</p>
                <p className="text-sm opacity-90 mt-2">Scan your student ID to check out</p>
              </CardContent>
            </Card>
          </Link>

          {/* Admin */}
          <Link to="/admin">
            <Card className="hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-accent text-accent-foreground cursor-pointer">
              <CardHeader className="text-center bg-green-700 py-[30px]">
                <Settings size={48} className="mx-auto mb-2 bg-transparent" />
                <CardTitle className="text-2xl text-zinc-50">Admin</CardTitle>
              </CardHeader>
              <CardContent className="text-center bg-green-700 py-[17px]">
                <p className="text-lg text-slate-50">View dashboard</p>
                <p className="text-sm opacity-90 mt-2 text-slate-50">Simple overview of library activity</p>
              </CardContent>
            </Card>
          </Link>

          {/* Library Staff */}
          <Link to="/staff">
            <Card className="hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-secondary text-secondary-foreground cursor-pointer">
              <CardHeader className="text-center bg-amber-500 py-[30px]">
                <Users size={48} className="mx-auto mb-2" />
                <CardTitle className="text-2xl text-slate-50">Library Staff</CardTitle>
              </CardHeader>
              <CardContent className="text-center bg-amber-500 py-[17px]">
                <p className="text-lg text-slate-50">Manage system</p>
                <p className="text-sm opacity-90 mt-2 text-slate-50">Add students, edit accounts, export reports</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-card shadow-lg p-6 rounded-md my-[65px] px-[49px] mx-[5px] py-[24px]">
          <h2 className="text-2xl font-bold text-center mb-4 text-card-foreground">How to Use</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-card-foreground">For Students:</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="py-0 my-0 mx-0 px-[6px]">• Use "Check In" when entering the library</li>
                <li>• Use "Check Out" when leaving the library</li>
                <li>• Simply scan your student ID barcode</li>
                <li>• Ask library staff if you need help</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-card-foreground mx-0 px-0">For Staff:</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Admin: View simple dashboard overview</li>
                <li>• Staff: Manage student accounts and reports</li>
                <li>• Export attendance data by day or month</li>
                <li>• Add and edit student information</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default HomePage;