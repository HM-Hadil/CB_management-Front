import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { RendezVousService } from '../../services/rendez-vous.service';
import { PresenceService } from '../../services/presence.service';
import { AvisService } from '../../services/avis.service';
import { StatsService } from '../../services/stats.service';
import {
  UserDto, Role, RegisterRequest, UpdateUserRequest,
  RendezVousResponse, ServiceRendezVousDto, StatutRendezVous, StatutService, StatutMariee, TypeClient, TypeService,
  AvisClienteDto, PresenceResponse, StatutPresence,
  StatsRdvEmployeeDto, StatsPresenceEmployeeDto
} from '../../models/auth.models';

type Tab = 'all' | 'employees' | 'receptionists' | 'rdv' | 'presence' | 'stats';
type ModalMode = 'create' | 'edit';

interface AdminRdvRow {
  rdv: RendezVousResponse;
  services: ServiceRendezVousDto[];
  date: string; // YYYY-MM-DD
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {

  // ── Staff State ───────────────────────────────────────────────
  users = signal<UserDto[]>([]);
  loading = signal(false);
  activeTab = signal<Tab>('all');
  searchQuery = signal('');
  showModal = signal(false);
  modalMode = signal<ModalMode>('create');
  modalLoading = signal(false);
  modalError = signal('');
  selectedUser = signal<UserDto | null>(null);
  deleteConfirmId = signal<number | null>(null);
  toastMessage = signal('');
  toastType = signal<'success' | 'error'>('success');
  showPassword = signal(false);
  sidebarOpen = signal(false);

  // ── RDV State ─────────────────────────────────────────────────
  allRdv = signal<RendezVousResponse[]>([]);
  avis = signal<AvisClienteDto[]>([]);
  private avisNoteMap = computed(() => new Map(this.avis().map(a => [a.rendezVousId, a.note])));
  rdvLoading = signal(false);
  rdvFilterStatut = signal<StatutRendezVous | 'ALL'>('ALL');
  rdvFilterTypeClient = signal<TypeClient | 'ALL' | 'MARIAGE_SERVICES'>('ALL');
  rdvFilterEmployeeStr = signal<string>('ALL');
  rdvSearch = signal('');
  rdvFilterDate = signal<string>('');
  rdvViewPeriod = signal<'today' | 'week' | 'month' | 'all'>('today');
  selectedRdv = signal<RendezVousResponse | null>(null);
  showRdvDetail = signal(false);

  // ── Form state ───────────────────────────────────────────────
  form: RegisterRequest & { confirmPassword?: string } = {
    nom: '', prenom: '', email: '', telephone: '',
    password: '', confirmPassword: '',
    role: Role.EMPLOYEE
  };

  editForm: UpdateUserRequest = {
    nom: '', prenom: '', email: '', telephone: '',
    password: '', role: Role.EMPLOYEE
  };

  readonly specialites: { value: string; label: string }[] = [
    { value: 'SOINS',         label: 'Soins' },
    { value: 'COIFFEUSE',     label: 'Coiffeure' },
    { value: 'ESTHETICIENNE', label: 'Esthétique' },
    { value: 'ONGLERIE',      label: 'Onglerie' },
    { value: 'MAQUILLEUSE',   label: 'Maquillage' }
  ];

  readonly specialiteLabels: Record<string, string> = {
    SOINS: 'Soins', COIFFEUSE: 'Coiffeure',
    ESTHETICIENNE: 'Esthétique', ONGLERIE: 'Onglerie', MAQUILLEUSE: 'Maquillage'
  };

  // ── Computed (Staff) ─────────────────────────────────────────
  filteredUsers = computed(() => {
    let list = this.users();
    const tab = this.activeTab();
    const q = this.searchQuery().toLowerCase();

    if (tab === 'employees')     list = list.filter(u => u.role === Role.EMPLOYEE);
    if (tab === 'receptionists') list = list.filter(u => u.role === Role.RECEPTIONIST);

    if (q) {
      list = list.filter(u =>
        u.nom.toLowerCase().includes(q) ||
        u.prenom.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.specialites?.some(s => s.toLowerCase().includes(q)) ?? false)
      );
    }
    return list;
  });

  totalEmployees = computed(() => this.users().filter(u => u.role === Role.EMPLOYEE).length);
  totalReception = computed(() => this.users().filter(u => u.role === Role.RECEPTIONIST).length);
  totalActive    = computed(() => this.users().filter(u => u.activated).length);
  isEmployeeForm = computed(() => this.form.role === Role.EMPLOYEE);
  isEmployeeEdit = computed(() => this.editForm.role === Role.EMPLOYEE);
  currentAdmin   = computed(() => this.authService.currentUser());

  // ── Computed (RDV) ────────────────────────────────────────────
  filteredRdv = computed(() => {
    let list = this.allRdv();
    const period = this.rdvViewPeriod();
    const st  = this.rdvFilterStatut();
    const tc  = this.rdvFilterTypeClient();
    const emp = this.rdvFilterEmployeeStr();
    const q   = this.rdvSearch().toLowerCase().trim();
    const d   = this.rdvFilterDate();

    if (!d) {
      const now = new Date();
      if (period === 'today') {
        const today = now.toDateString();
        list = list.filter(r => new Date(r.dateDebut).toDateString() === today);
      } else if (period === 'week') {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0, 0, 0, 0);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
        list = list.filter(r => { const rd = new Date(r.dateDebut); return rd >= mon && rd <= sun; });
      } else if (period === 'month') {
        list = list.filter(r => {
          const rd = new Date(r.dateDebut);
          return rd.getMonth() === now.getMonth() && rd.getFullYear() === now.getFullYear();
        });
      }
    }
    if (st !== 'ALL') list = list.filter(r => r.statut === st);
    if (tc === TypeClient.NORMAL) list = list.filter(r => r.typeClient === TypeClient.NORMAL);
    else if (tc === TypeClient.MARIAGE) list = list.filter(r => r.typeClient === TypeClient.MARIAGE && !r.services.some(s => s.employeeId));
    else if (tc === 'MARIAGE_SERVICES') list = list.filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId));
    if (emp !== 'ALL') {
      const empId = parseInt(emp, 10);
      list = list.filter(r => r.services.some(s => s.employeeId === empId));
    }
    if (q) list = list.filter(r =>
      r.nomClient.toLowerCase().includes(q)    ||
      r.prenomClient.toLowerCase().includes(q) ||
      (r.telephoneClient?.toLowerCase().includes(q) ?? false)
    );
    if (d) list = list.filter(r => r.dateDebut.startsWith(d));
    return [...list].sort((a, b) => new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime());
  });

  expandedAdminRdvRows = computed((): AdminRdvRow[] => {
    const filterDate = this.rdvFilterDate();
    const period = this.rdvViewPeriod();
    const st  = this.rdvFilterStatut();
    const tc  = this.rdvFilterTypeClient();
    const emp = this.rdvFilterEmployeeStr();
    const q   = this.rdvSearch().toLowerCase().trim();
    const now = new Date();

    let rdvList = this.allRdv();

    if (st !== 'ALL') rdvList = rdvList.filter(r => r.statut === st);
    if (tc === TypeClient.NORMAL) rdvList = rdvList.filter(r => r.typeClient === TypeClient.NORMAL);
    else if (tc === TypeClient.MARIAGE) rdvList = rdvList.filter(r => r.typeClient === TypeClient.MARIAGE && !r.services.some(s => s.employeeId));
    else if (tc === 'MARIAGE_SERVICES') rdvList = rdvList.filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId));
    if (emp !== 'ALL') {
      const empId = parseInt(emp, 10);
      rdvList = rdvList.filter(r => r.services.some(s => s.employeeId === empId));
    }
    if (q) rdvList = rdvList.filter(r =>
      r.nomClient.toLowerCase().includes(q) ||
      r.prenomClient.toLowerCase().includes(q) ||
      (r.telephoneClient?.toLowerCase().includes(q) ?? false)
    );

    const rows: AdminRdvRow[] = [];

    for (const rdv of rdvList) {
      const byDate = new Map<string, ServiceRendezVousDto[]>();
      if (rdv.services.length === 0) {
        byDate.set(rdv.dateDebut.substring(0, 10), []);
      } else {
        for (const srv of rdv.services) {
          const date = srv.datePrevue ? srv.datePrevue.substring(0, 10) : rdv.dateDebut.substring(0, 10);
          if (!byDate.has(date)) byDate.set(date, []);
          byDate.get(date)!.push(srv);
        }
      }

      for (const [date, services] of byDate) {
        let include = false;
        if (filterDate) {
          include = date === filterDate;
        } else {
          const d = new Date(date + 'T00:00:00');
          if (period === 'today') {
            include = d.toDateString() === now.toDateString();
          } else if (period === 'week') {
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0, 0, 0, 0);
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
            include = d >= mon && d <= sun;
          } else if (period === 'month') {
            include = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          } else {
            include = true;
          }
        }
        if (include) rows.push({ rdv, services, date });
      }
    }

    return rows.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return b.rdv.dateDebut.localeCompare(a.rdv.dateDebut);
    });
  });

  rdvTotalCount      = computed(() => this.allRdv().length);
  rdvAujourdhuiCount = computed(() => {
    const today = new Date().toDateString();
    return this.allRdv().filter(r => new Date(r.dateDebut).toDateString() === today).length;
  });
  rdvCetteSemaineCount = computed(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now); monday.setDate(now.getDate() + diffToMonday); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
    return this.allRdv().filter(r => { const d = new Date(r.dateDebut); return d >= monday && d <= sunday; }).length;
  });
  rdvCeMoisCount = computed(() => {
    const now = new Date();
    return this.allRdv().filter(r => {
      const d = new Date(r.dateDebut);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  });
  rdvMariageCount            = computed(() => this.allRdv().filter(r => r.typeClient === TypeClient.MARIAGE).length);
  rdvNormalCount             = computed(() => this.allRdv().filter(r => r.typeClient === TypeClient.NORMAL).length);
  rdvMariageAvecServicesCount = computed(() => this.allRdv().filter(r => r.typeClient === TypeClient.MARIAGE && r.services.some(s => s.employeeId)).length);

  // Status counts filtered by current period/date selection
  private rdvPeriodFiltered = computed(() => {
    let list = this.allRdv();
    const period = this.rdvViewPeriod();
    const d = this.rdvFilterDate();
    if (!d) {
      const now = new Date();
      if (period === 'today') {
        const today = now.toDateString();
        list = list.filter(r => new Date(r.dateDebut).toDateString() === today);
      } else if (period === 'week') {
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0, 0, 0, 0);
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
        list = list.filter(r => { const rd = new Date(r.dateDebut); return rd >= mon && rd <= sun; });
      } else if (period === 'month') {
        list = list.filter(r => {
          const rd = new Date(r.dateDebut);
          return rd.getMonth() === now.getMonth() && rd.getFullYear() === now.getFullYear();
        });
      }
    } else {
      list = list.filter(r => r.dateDebut.startsWith(d));
    }
    return list;
  });

  rdvConfirmeCount  = computed(() => this.rdvPeriodFiltered().filter(r => r.statut === StatutRendezVous.CONFIRME).length);
  rdvAnnuleCount    = computed(() => this.rdvPeriodFiltered().filter(r => r.statut === StatutRendezVous.ANNULE).length);
  rdvTermineCount   = computed(() => this.rdvPeriodFiltered().filter(r => r.statut === StatutRendezVous.TERMINE).length);

  employeesList = computed(() => this.users().filter(u => u.role === Role.EMPLOYEE && u.activated));

  // ── Stats state ───────────────────────────────────────────────
  private readonly CHART_COLORS = [
    '#f59e0b','#ec4899','#8b5cf6','#10b981','#3b82f6','#f97316','#06b6d4','#84cc16'
  ];
  readonly MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  statsRdvData      = signal<StatsRdvEmployeeDto[]>([]);
  statsPresenceData = signal<StatsPresenceEmployeeDto[]>([]);
  statsLoading      = signal(false);
  statsYear         = signal(new Date().getFullYear());
  statsPresenceMois = signal(new Date().getMonth() + 1);

  // All unique employees present in RDV stats
  statsEmployees = computed(() => {
    const map = new Map<number, { id: number; nom: string; prenom: string; color: string }>();
    this.statsRdvData().forEach(d => {
      if (!map.has(d.employeeId)) {
        map.set(d.employeeId, {
          id: d.employeeId,
          nom: d.employeeNom,
          prenom: d.employeePrenom,
          color: this.CHART_COLORS[map.size % this.CHART_COLORS.length]
        });
      }
    });
    return [...map.values()];
  });

  // { mois: 1..12, bars: { empId, count, color }[] }[]  — all 12 months always present
  barChartMonths = computed(() => {
    const employees = this.statsEmployees();
    const data = this.statsRdvData();
    return Array.from({ length: 12 }, (_, i) => {
      const mois = i + 1;
      return {
        mois,
        label: this.MOIS_LABELS[i],
        bars: employees.map(emp => ({
          empId: emp.id,
          color: emp.color,
          count: data.find(d => d.employeeId === emp.id && d.mois === mois)?.count ?? 0
        }))
      };
    });
  });

  barChartMax = computed(() => {
    const max = Math.max(...this.statsRdvData().map(d => d.count), 1);
    return max;
  });

  barChartYTicks = computed(() => {
    const max = this.barChartMax();
    return [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0];
  });

  totalPresenceJours = computed(() =>
    this.statsPresenceData().reduce((s, d) => s + d.joursPresent, 0)
  );

  topPerformer = computed(() => {
    const employees = this.statsEmployees();
    if (employees.length === 0) return null;
    const totals = employees.map(emp => ({
      ...emp,
      total: this.statsRdvData().filter(d => d.employeeId === emp.id).reduce((s, d) => s + d.count, 0)
    }));
    return totals.sort((a, b) => b.total - a.total)[0];
  });

  // Pie chart slices for presence
  pieSlices = computed(() => {
    const data = this.statsPresenceData();
    const total = data.reduce((s, d) => s + d.joursPresent, 0);
    if (total === 0) return [];
    let angle = 0;
    return data.map((d, i) => {
      const start = angle;
      const sweep = (d.joursPresent / total) * 360;
      angle += sweep;
      return {
        ...d,
        color: this.CHART_COLORS[i % this.CHART_COLORS.length],
        startAngle: start,
        endAngle: angle,
        percent: Math.round((d.joursPresent / total) * 100)
      };
    });
  });

  // ── Présence state ────────────────────────────────────────────
  presences = signal<PresenceResponse[]>([]);
  presenceLoading = signal(false);
  presenceSelectedDate = signal<string>((() => {
    const n = new Date(); const p = (x: number) => x.toString().padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
  })());
  StatutPresence = StatutPresence;

  presentsCount = computed(() => this.presences().filter(p => p.statut === StatutPresence.PRESENT || p.statut === StatutPresence.RETARD).length);
  absentsCount  = computed(() => this.presences().filter(p => p.statut === StatutPresence.ABSENT).length);
  totalHeures   = computed(() => {
    const sum = this.presences().reduce((acc, p) => acc + (p.heuresTravaillees ?? 0), 0);
    return Math.round(sum * 100) / 100;
  });

  formatHeuresTravaillees(h: number): string {
    const totalMin = Math.round(h * 60);
    const heures = Math.floor(totalMin / 60);
    const min = totalMin % 60;
    if (heures === 0) return `${min}min`;
    if (min === 0) return `${heures}h`;
    return `${heures}h ${min}min`;
  }

  // ── Enums exposed ────────────────────────────────────────────
  Role = Role;
  StatutRendezVous = StatutRendezVous;
  StatutService = StatutService;
  StatutMariee = StatutMariee;
  TypeClient = TypeClient;

  readonly MARIEE_SERVICE_TYPES: TypeService[] = [
    TypeService.MAQUILLAGE_SDAG,
    TypeService.MAQUILLAGE_HENNA,
    TypeService.MAQUILLAGE_BADOU,
    TypeService.MAQUILLAGE_D5OUL,
    TypeService.MAQUILLAGE_FIANCAILLES,
  ];

  constructor(
    private userService: UserService,
    public authService: AuthService,
    private rendezVousService: RendezVousService,
    private presenceService: PresenceService,
    private avisService: AvisService,
    private statsService: StatsService
  ) {}

  getRdvNote(rdvId: number): number | null {
    return this.avisNoteMap().get(rdvId) ?? null;
  }

  getStarsArray(): number[] { return [1, 2, 3, 4, 5]; }

  ngOnInit() {
    this.loadUsers();
  }

  // ── Data ─────────────────────────────────────────────────────
  loadUsers() {
    this.loading.set(true);
    this.userService.getAllStaff().subscribe({
      next: (data) => { this.users.set(data); this.loading.set(false); },
      error: ()    => { this.loading.set(false); this.showToast('Erreur lors du chargement.', 'error'); }
    });
  }

  loadAllRdv() {
    this.rdvLoading.set(true);
    this.rendezVousService.listerTous().subscribe({
      next: (data) => { this.allRdv.set(data); this.rdvLoading.set(false); },
      error: ()    => { this.rdvLoading.set(false); this.showToast('Erreur lors du chargement des RDV.', 'error'); }
    });
  }

  // ── Tab ───────────────────────────────────────────────────────
  setTab(tab: Tab) {
    this.activeTab.set(tab);
    this.sidebarOpen.set(false);
    if (tab === 'rdv' && this.allRdv().length === 0) {
      this.loadAllRdv();
      this.avisService.listerTous().subscribe({ next: (data) => this.avis.set(data), error: () => {} });
    }
    if (tab === 'presence') {
      this.loadPresence();
    }
    if (tab === 'stats') {
      this.loadStatsRdv();
      this.loadStatsPresence();
    }
  }

  loadStatsRdv() {
    this.statsLoading.set(true);
    this.statsService.getRdvParEmployeeParMois(this.statsYear()).subscribe({
      next: (data) => { this.statsRdvData.set(data); this.statsLoading.set(false); },
      error: ()    => { this.statsLoading.set(false); this.showToast('Erreur chargement stats RDV.', 'error'); }
    });
  }

  loadStatsPresence() {
    this.statsService.getPresenceParEmployeeParMois(this.statsPresenceMois(), this.statsYear()).subscribe({
      next: (data) => this.statsPresenceData.set(data),
      error: ()    => this.showToast('Erreur chargement stats présence.', 'error')
    });
  }

  changeStatsYear(delta: number) {
    this.statsYear.update(y => y + delta);
    this.loadStatsRdv();
    this.loadStatsPresence();
  }

  changeStatsMois(mois: number) {
    this.statsPresenceMois.set(mois);
    this.loadStatsPresence();
  }

  // SVG pie slice path (cx,cy = center, r = radius)
  getPieSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    if (endAngle - startAngle >= 359.9) {
      // Full circle
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`;
    }
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  }

  getEmployeeInitialsById(prenom: string, nom: string): string {
    return (prenom.charAt(0) + nom.charAt(0)).toUpperCase();
  }

  getTotalRdvForEmployee(empId: number): number {
    return this.statsRdvData().filter(d => d.employeeId === empId).reduce((s, d) => s + d.count, 0);
  }

  // ── RDV filters ──────────────────────────────────────────────
  setRdvFilterStatut(s: StatutRendezVous | 'ALL')    { this.rdvFilterStatut.set(s); }
  setRdvFilterTypeClient(tc: TypeClient | 'ALL' | 'MARIAGE_SERVICES') { this.rdvFilterTypeClient.set(tc); }

  openRdvDetail(rdv: RendezVousResponse) {
    this.selectedRdv.set(rdv);
    this.showRdvDetail.set(true);
  }

  closeRdvDetail() {
    this.showRdvDetail.set(false);
    this.selectedRdv.set(null);
  }

  isMarieeService(srv: ServiceRendezVousDto): boolean {
    return this.MARIEE_SERVICE_TYPES.includes(srv.typeService as TypeService);
  }

  canTerminerMariee(rdv: RendezVousResponse): boolean {
    // Show RDV-level "Terminer" only when all services are Mariée-type (no employees)
    return rdv.typeClient === TypeClient.MARIAGE
      && rdv.services.length > 0
      && rdv.services.every(s => this.isMarieeService(s))
      && rdv.statut !== StatutRendezVous.TERMINE
      && rdv.statut !== StatutRendezVous.ANNULE;
  }

  terminerRdvMariee(rdv: RendezVousResponse) {
    this.rendezVousService.changerStatut(rdv.id, StatutRendezVous.TERMINE).subscribe({
      next: (updated) => {
        this.allRdv.update(list => list.map(r => r.id === updated.id ? updated : r));
        this.showToast(`RDV de ${rdv.prenomClient} ${rdv.nomClient} terminé.`, 'success');
      },
      error: () => this.showToast('Erreur lors de la mise à jour du statut.', 'error')
    });
  }

  changerStatutService(serviceId: number, statut: StatutService, rdvId: number) {
    this.rendezVousService.changerStatutService(serviceId, statut).subscribe({
      next: (updatedRdv) => {
        this.allRdv.update(list => list.map(r => r.id === rdvId ? updatedRdv : r));
        this.showToast('Statut du service mis à jour.', 'success');
      },
      error: () => this.showToast('Erreur lors de la mise à jour du service.', 'error')
    });
  }

  // ── Modal Create ─────────────────────────────────────────────
  openCreateModal(role?: Role) {
    this.form = {
      nom: '', prenom: '', email: '', telephone: '',
      password: '', confirmPassword: '',
      role: role ?? Role.EMPLOYEE
    };
    this.modalError.set('');
    this.modalMode.set('create');
    this.showModal.set(true);
  }

  // ── Modal Edit ───────────────────────────────────────────────
  openEditModal(user: UserDto) {
    this.selectedUser.set(user);
    this.editForm = {
      nom: user.nom, prenom: user.prenom, email: user.email,
      telephone: user.telephone ?? '', password: '',
      role: user.role
    };
    this.modalError.set('');
    this.modalMode.set('edit');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.modalError.set(''); }

  // ── Submit Create ────────────────────────────────────────────
  submitCreate() {
    if (!this.form.nom || !this.form.prenom || !this.form.email || !this.form.password) {
      this.modalError.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (this.form.password !== this.form.confirmPassword) {
      this.modalError.set('Les mots de passe ne correspondent pas.');
      return;
    }
    if (this.form.password.length < 6) {
      this.modalError.set('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    this.modalLoading.set(true);
    this.modalError.set('');

    const request: RegisterRequest = {
      nom: this.form.nom, prenom: this.form.prenom,
      email: this.form.email, telephone: this.form.telephone,
      password: this.form.password, role: this.form.role
    };

    this.userService.createUser(request).subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.closeModal();
        this.loadUsers();
        this.showToast(`Compte de ${this.form.prenom} ${this.form.nom} créé avec succès !`, 'success');
      },
      error: (err: Error) => {
        this.modalLoading.set(false);
        this.modalError.set(err.message);
      }
    });
  }

  // ── Submit Edit ──────────────────────────────────────────────
  submitEdit() {
    const user = this.selectedUser();
    if (!user) return;
    if (!this.editForm.password) {
      this.modalError.set('Veuillez saisir un nouveau mot de passe.');
      return;
    }
    if (this.editForm.password.length < 6) {
      this.modalError.set('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    this.modalLoading.set(true);
    this.modalError.set('');

    const request: UpdateUserRequest = {
      password: this.editForm.password
    };

    this.userService.updateUser(user.id, request).subscribe({
      next: (updated) => {
        this.modalLoading.set(false);
        this.closeModal();
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.showToast('Mot de passe mis à jour avec succès !', 'success');
      },
      error: (err: Error) => {
        this.modalLoading.set(false);
        this.modalError.set(err.message);
      }
    });
  }

  // ── Delete ───────────────────────────────────────────────────
  confirmDelete(id: number) { this.deleteConfirmId.set(id); }
  cancelDelete()            { this.deleteConfirmId.set(null); }

  deleteUser(id: number) {
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== id));
        this.deleteConfirmId.set(null);
        this.showToast('Compte supprimé.', 'success');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
  }

  // ── Toggle Activation ────────────────────────────────────────
  toggleActivation(user: UserDto) {
    this.userService.toggleActivation(user.id).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.showToast(`Compte ${updated.activated ? 'activé' : 'désactivé'}.`, 'success');
      },
      error: () => this.showToast('Erreur lors de la mise à jour.', 'error')
    });
  }

  // ── Toast ────────────────────────────────────────────────────
  showToast(msg: string, type: 'success' | 'error') {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(''), 4000);
  }

  // ── Helpers ──────────────────────────────────────────────────
  getSpecialitesLabels(specialites?: string[]): string {
    if (!specialites || specialites.length === 0) return '—';
    return specialites.map(s => this.specialiteLabels[s] ?? s).join(', ');
  }

  getSpecialiteLabel(specialite: string | null | undefined): string {
    if (!specialite) return '—';
    return this.specialiteLabels[specialite] ?? specialite;
  }

  getRoleLabel(role: Role): string {
    return role === Role.EMPLOYEE ? 'Employée' : 'Réceptionniste';
  }

  getRoleIcon(role: Role): string {
    return role === Role.EMPLOYEE ? 'pi-briefcase' : 'pi-desktop';
  }

  getInitials(user: UserDto): string {
    return (user.prenom.charAt(0) + user.nom.charAt(0)).toUpperCase();
  }

  getStatutLabel(s: StatutRendezVous): string {
    const m: Record<StatutRendezVous, string> = {
      EN_ATTENTE: 'En attente', CONFIRME: 'Confirmé',
      EN_COURS: 'En cours', ANNULE: 'Annulé', TERMINE: 'Terminé'
    };
    return m[s];
  }

  getStatutClass(s: StatutRendezVous): string {
    const m: Record<StatutRendezVous, string> = {
      EN_ATTENTE: 'en-attente', CONFIRME: 'confirme',
      EN_COURS: 'en-cours', ANNULE: 'annule', TERMINE: 'termine'
    };
    return m[s];
  }

  getTypeClientLabel(t: TypeClient): string {
    return t === TypeClient.MARIAGE ? '💍 Mariée' : 'Normal';
  }

  getTypeServiceLabel(ts: TypeService | string): string {
    const map: Record<string, string> = {
      SOIN_VISAGE: 'Soin visage', SOIN_PIED: 'Soin pied',
      SOIN_MAIN: 'Soin main', HYDRAFACIALE: 'Hydrafaciale',
      COUPE: 'Coupe', PROTEINE: 'Protéine', COLORATION_SIMPLE: 'Coloration simple',
      BALAYAGE: 'Balayage', SOIN_CAPILLAIRE: 'Soin capillaire', BRUSHING: 'Brushing',
      EPILATION_VISAGE: 'Épilation visage', EPILATION_MOUSTACHE: 'Épilation moustache',
      EPILATION_SOURCILS: 'Épilation sourcils',
      VERNIS_PERMANENT_MAIN: 'Vernis perm. main', VERNIS_PERMANENT_PIED: 'Vernis perm. pied',
      GEL_SUR_ONGLE_NATURELLE: 'Gel ongle naturelle', GEL_CAPSULE: 'Gel capsule',
      DEPOSE_VERNIS: 'Dépose vernis', MAQUILLAGE: 'Maquillage'
    };
    return map[ts] ?? String(ts);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    const date = new Date(isDateOnly ? dateStr + 'T00:00:00' : dateStr);
    if (isDateOnly) {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return date.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatTime(dateStr: string): string {
    if (!dateStr || /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getClientInitials(rdv: RendezVousResponse): string {
    return (rdv.prenomClient.charAt(0) + rdv.nomClient.charAt(0)).toUpperCase();
  }

  formatDuree(minutes: number): string {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  }

  // ── Présence (lecture seule) ─────────────────────────────────
  loadPresence(date?: string) {
    const d = date ?? this.presenceSelectedDate();
    this.presenceLoading.set(true);
    this.presenceService.getPresenceForDate(d).subscribe({
      next: (data) => { this.presences.set(data); this.presenceLoading.set(false); },
      error: () => { this.presenceLoading.set(false); this.showToast('Erreur lors du chargement de la présence.', 'error'); }
    });
  }

  selectPresenceDate(iso: string) {
    this.presenceSelectedDate.set(iso);
    this.loadPresence(iso);
  }

  getPresenceStatutLabel(s: StatutPresence): string {
    const map: Record<StatutPresence, string> = {
      ABSENT: 'Absent', PRESENT: 'Présent', RETARD: 'Retard', TERMINE: 'Terminé'
    };
    return map[s];
  }

  getPresenceStatutClass(s: StatutPresence): string {
    const map: Record<StatutPresence, string> = {
      ABSENT: 'absent', PRESENT: 'present', RETARD: 'retard', TERMINE: 'termine'
    };
    return map[s];
  }

  getEmployeeInitials(p: PresenceResponse): string {
    return (p.employeePrenom.charAt(0) + p.employeeNom.charAt(0)).toUpperCase();
  }

  isToday(iso: string): boolean {
    return iso === this.getTodayDate();
  }

  formatPresenceDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  }

  getTodayDate(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  logout() { this.authService.logout(); }
}
