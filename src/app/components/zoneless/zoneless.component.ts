import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SubFilter {
  id: string;
  name: string;
  selected: boolean;
}

interface Filter {
  id: string;
  name: string;
  selected: boolean;
  subFilters?: SubFilter[];
}

interface FilterDB extends DBSchema {
  filters: {
    key: string;
    value: Filter[];
  };
}

@Component({
  selector: 'app-zoneless',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './zoneless.component.html',
  styleUrls: ['./zoneless.component.scss']
})
export class ZonelessComponent implements OnInit {

  filters: Filter[] = [];
  isListOpen: boolean = false;
  db!: IDBPDatabase<FilterDB>;
  
  @ViewChild('filterContainer') filterContainer!: ElementRef;

  constructor(private eRef: ElementRef) { }

  ngOnInit(): void {
    this.initFilters();
    this.initDB().then(() => {
      this.loadStateFromDB();
    });
  }

  // Initialize filters data
  private initFilters() {
    this.filters = [
      {
        id: 'sales',
        name: 'Продажи',
        selected: false,
        subFilters: [
          { id: 'unsorted', name: 'Неразобранное', selected: false },
          { id: 'negotiation', name: 'Переговоры', selected: false },
          { id: 'decision', name: 'Принимают решение', selected: false },
          { id: 'successful', name: 'Успешно', selected: false },
        ]
      },
      { id: 'staff', name: 'Сотрудники', selected: false },
      { id: 'partners', name: 'Партнёры', selected: false },
      { id: 'event', name: 'Ивент', selected: false },
      { id: 'incoming_requests', name: 'Входящие обращения', selected: false },
    ];
  }

  // Initialize IndexedDB
  async initDB() {
    this.db = await openDB<FilterDB>('FilterDB', 1, {
      upgrade(db) {
        db.createObjectStore('filters');
      }
    });
  }

  // Load state from IndexedDB
  async loadStateFromDB() {
    const savedFilters = await this.db.get('filters', 'selectedFilters');
    if (savedFilters) {
      this.filters = savedFilters;
    }
  }

  // Save state to IndexedDB
  async saveStateToDB() {
    await this.db.put('filters', this.filters, 'selectedFilters');
  }

  // Get dynamic button text
  getButtonText(): string {
    if (!this.isListOpen) {
      return 'Открыть фильтры';
    }
    const anySelected = this.filters.some(f => f.selected || (f.subFilters && f.subFilters.some(s => s.selected)));
    if (anySelected) {
      return 'Очистить выбор';
    } else {
      return 'Выбрать всё';
    }
  }

  // Determine the icon class for the toggle button
  getToggleIconClass(): string {
    if (!this.isListOpen) {
      return '';
    }
    const selectedCount = this.getSelectedCount();
    if (selectedCount === 0) {
      return 'icon-empty';
    } else if (selectedCount > 0 && !this.allFiltersSelected()) {
      return 'icon-minus';
    } else {
      return 'icon-check';
    }
  }

  // Get number of selected filters and subfilters
  private getSelectedCount(): number {
    let count = 0;
    this.filters.forEach(filter => {
      if (filter.selected) count++;
      if (filter.subFilters) {
        count += filter.subFilters.filter(sub => sub.selected).length;
      }
    });
    return count;
  }

  // Check if all filters and subfilters are selected
  private allFiltersSelected(): boolean {
    return this.filters.every(filter => {
      if (filter.subFilters) {
        return filter.selected && filter.subFilters.every(sub => sub.selected);
      }
      return filter.selected;
    });
  }

  // Handle button click based on state
  handleButtonClick(): void {
    if (!this.isListOpen) {
      this.toggleList(true);
    } else {
      const anySelected = this.filters.some(f => f.selected || (f.subFilters && f.subFilters.some(s => s.selected)));
      if (anySelected) {
        this.clearSelection();
      } else {
        this.selectAll();
      }
    }
  }

  // Toggle list visibility
  private toggleList(open?: boolean) {
    if (typeof open === 'boolean') {
      this.isListOpen = open;
    } else {
      this.isListOpen = !this.isListOpen;
    }
    if (!this.isListOpen) {
      this.saveStateToDB();
    }
  }

  // Select all filters and subfilters
  private selectAll(): void {
    this.filters.forEach(filter => {
      filter.selected = true;
      if (filter.subFilters) {
        filter.subFilters.forEach(sub => sub.selected = true);
      }
    });
    this.saveStateToDB();
  }

  // Clear all selections
  clearSelection(): void {
    this.filters.forEach(filter => {
      filter.selected = false;
      if (filter.subFilters) {
        filter.subFilters.forEach(sub => sub.selected = false);
      }
    });
    this.saveStateToDB();
  }

  // Toggle filter selection
  toggleFilter(filter: Filter) {
    filter.selected = !filter.selected;
    if (filter.subFilters) {
      filter.subFilters.forEach(sub => sub.selected = filter.selected);
    }
    this.saveStateToDB();
  }

  // Toggle subfilter selection
  toggleSubFilter(filter: Filter, sub: SubFilter) {
    sub.selected = !sub.selected;
    // If any subfilter is unselected, unselect the parent
    if (filter.subFilters && filter.subFilters.some(s => !s.selected)) {
      filter.selected = false;
    } else {
      filter.selected = true;
    }
    this.saveStateToDB();
  }

  // Get summary of selected filters
  getSelectedSummary(): string {
    let selectedFilters = this.filters.filter(f => f.selected || (f.subFilters && f.subFilters.some(s => s.selected))).length;
    let selectedSubFilters = this.filters.reduce((count, f) => {
      if (f.subFilters) {
        count += f.subFilters.filter(s => s.selected).length;
      }
      return count;
    }, 0);

    const filterText = (
      selectedFilters === 0 ? 'воронок' :
        selectedFilters === 1 ? 'воронка' :
          selectedFilters > 4 ? 'воронок' : 'воронки'
    );
    const subFilterText = (
      selectedSubFilters === 0 ? 'этапов' :
        selectedSubFilters === 1 ? 'этап' :
          selectedSubFilters > 4 ? 'этапов' : 'этапа'
    );

    if (selectedFilters === 0 && selectedSubFilters === 0) {
      return 'Нет выбранных фильтров';
    }

    return `${selectedFilters} ${filterText}, ${selectedSubFilters} ${subFilterText}`;
  }

  // Close the list when clicking outside the filter-container
  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (this.isListOpen && this.filterContainer) {
      const clickedInside = this.filterContainer.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.isListOpen = false;
        this.saveStateToDB();
      }
    }
  }
}
